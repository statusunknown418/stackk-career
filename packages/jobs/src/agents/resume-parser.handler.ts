/**
 * Resume parser agent.
 *
 * Phase 1: validate the PDF is a resume (gate — throws if not).
 * Phase 2: extract everything in 4 parallel bundled `generateText` calls:
 *          - header     (contact + summary)
 *          - experience (work history — own call; heaviest output)
 *          - entries    (education, certifications, projects, volunteering)
 *          - skills     (skills, languages)
 *          Each call emits running/complete/failed events forwarded to Trigger metadata.
 *
 * Every call has a per-bundle timeout layered on top of the outer task signal so a
 * single stuck section can't hold the run open — siblings free compute immediately.
 *
 * Returned shape stays identical to the per-section version so `planSections` and
 * `insert-blocks` are untouched.
 */

import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import {
	extractedEntriesBundleSchema,
	extractedEntriesSectionSchema,
	extractedHeaderSchema,
	extractedSkillsBundleSchema,
	type ResumeParserPhase,
	type ResumeParserPhaseStatus,
	type ResumeParserStep,
	resumeValidationSchema,
} from "@stackk-career/schemas/jobs/resume-parser";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { logger } from "@trigger.dev/sdk";
import { type FinishReason, generateText, type LanguageModel, type LanguageModelUsage, Output } from "ai";
import { pdfUserMessage } from "../lib/ai/pdf-message";

// ─── Public surface ────────────────────────────────────────────────────────

export const RESUME_PARSER_MODEL = "google/gemini-2.5-pro" satisfies LanguageModel;
export const RESUME_PARSER_OBJECT_TYPE = "resume-parser";
export const RESUME_VALIDATOR_TOOL = "resume_validator";
export const HEADER_EXTRACTOR_TOOL = "header_extractor";
export const EXPERIENCE_EXTRACTOR_TOOL = "experience_extractor";
export const ENTRIES_BUNDLE_EXTRACTOR_TOOL = "entries_bundle_extractor";
export const SKILLS_BUNDLE_EXTRACTOR_TOOL = "skills_bundle_extractor";

// Per-call timeouts. Cap stuck calls so siblings free their share of the task slot.
// Validation is a small bool+name output — fast. Bundles emit multi-section JSON — heavier output tokens.
const VALIDATION_TIMEOUT_MS = Number(process.env.RESUME_PARSER_VALIDATION_TIMEOUT_MS ?? 30 * 1000); // 30s
const BUNDLE_TIMEOUT_MS = Number(process.env.RESUME_PARSER_BUNDLE_TIMEOUT_MS ?? 4 * 60 * 1000); // 4 min

// Bundle calls emit large nested JSON (experience can hold many jobs × many HTML bullets).
// Without an explicit cap the provider default truncates long outputs → JSON parse fails →
// the whole section disappears silently. Set generously high; the model rarely uses it all.
const BUNDLE_MAX_OUTPUT_TOKENS = Number(process.env.RESUME_PARSER_MAX_OUTPUT_TOKENS ?? 16_000);

export interface ResumeParserEvent {
	at?: number;
	detail?: string;
	kind: ResumeParserStep | ResumeParserPhase | Exclude<SectionKind, "custom"> | "contact";
	mock?: boolean;
	progress?: number;
	reason?: string;
	status: ResumeParserPhaseStatus;
	title?: string;
	toolName?: string;
}

export interface RunResumeParserInput {
	onEvent?: (event: ResumeParserEvent) => void;
	pdfUrl: string;
	signal?: AbortSignal;
}

export interface ResumeParserPhaseTelemetry {
	finishReason?: FinishReason;
	reason?: string;
	status: "completed" | "failed";
	toolName: string;
	usage?: LanguageModelUsage;
}

export interface ResumeParserTelemetry {
	finishReason: FinishReason | "partial";
	partialFailureCount: number;
	phases: Record<"entries" | "experience" | "header" | "skills" | "validation", ResumeParserPhaseTelemetry>;
	totalUsage?: LanguageModelUsage;
}

// ─── Prompts ───────────────────────────────────────────────────────────────

const VALIDATE_SYSTEM = `
Resume validator. Inspect the attached PDF.

Fields:
- isResume: true only if clearly a personal resume / CV.
- confidence: 0.0 - 1.0.
- candidateName: full name or null.
- reason: one short factual sentence.

Reject invoices, contracts, articles, syllabi, blank PDFs.
`.trim();

const HEADER_SYSTEM = `
Extract header from resume PDF. Return JSON with contact + summary.

Rules:
- Copy text verbatim. No paraphrasing.
- Missing → null. Never invent.
- String fields hold DATA only. No commentary, no reasoning, no meta-text.

contact:
- firstName / lastName: split full name. Empty string if missing.
- items: array of { kind, value, label? }. kind ∈ {address, email, phone, linkedin, website, other}.
- address = postal/city-state-country line only.
- Return null if no contact info found.

summary:
- paragraphs: array of { text, format }. format defaults to "html". Wrap text in <p>...</p>.
- Only real summary/objective paragraph. Absent → null.
- Never bullets, job descriptions, or skills here.
`.trim();

const EXPERIENCE_SYSTEM = `
Extract every work experience entry from the resume PDF. Return { entries: [...] }. Empty when zero jobs.

Output discipline:
- Every string field is DATA. No commentary, no reasoning, no meta-text.
- Missing → omit field. Never write explanations as values.
- Copy text verbatim. No paraphrasing.

Fields per entry:
- title: job role. Short. (e.g. "Senior Software Engineer")
- subtitle: company name only. Short. (e.g. "Acme Corp")
- location: place string only. City/region/country. Omit if absent. Never duties or bullets.
- isRemote: true if role is remote.
- startDate / endDate: "YYYY-MM". Omit endDate when ongoing. Years-only → "YYYY-01" / "YYYY-12".
- isCurrent: true only if "Present"/"Current"/"Now". When true, endDate omitted.
- descriptor: HTML body. descriptorFormat="html". entryStyle="standard".
  - Bullets → one <ul><li>...</li></ul> block.
  - Paragraphs → <p>...</p> before list.
  - Allowed tags: p, ul, ol, li, strong, em, b, i, br.
  - Omit if entry has no body.

Rules:
- Extract every job. Preserve PDF order.
- Each distinct role appears exactly once. No duplicates.
- "Remote"/"Hybrid" → isRemote=true AND location="Remote"/"Hybrid".
`.trim();

const ENTRIES_BUNDLE_SYSTEM = `
Extract education, certifications, projects, volunteering from resume PDF. One JSON object.

Output discipline:
- Every string field is DATA. No commentary, no reasoning, no meta-text.
- Missing → omit field. Never write explanations as values.
- Copy text verbatim. No paraphrasing.

Sections (each value = { entries: [...] } or null when absent):
- education: degrees, schools, bootcamps.
- certifications: certifications, licenses, credentials.
- projects: personal, academic, side projects.
- volunteering: volunteer, pro bono, community roles.
- Do NOT include work experience here (handled separately).

Field map per section:
- education: title=degree, subtitle=school, location=city/country.
- certifications: title=cert name, subtitle=issuer, location=omit unless stated.
- projects: title=project, subtitle=role/team (optional), location=omit unless stated.
- volunteering: title=role, subtitle=organization, location=city/country.

Common rules:
- location: place string only. Omit if not present.
- startDate / endDate: "YYYY-MM". Omit endDate when ongoing. Years-only → "YYYY-01" / "YYYY-12".
- isCurrent: true only if ongoing.
- descriptor: HTML body. Bullets → <ul><li>...</li></ul>. Paragraphs → <p>...</p>. Allowed tags: p, ul, ol, li, strong, em, b, i, br. Omit if no body.

Preserve PDF order. No duplicates across sections.
`.trim();

const SKILLS_BUNDLE_SYSTEM = `
Extract skills + languages from resume PDF. One JSON object.

Output discipline:
- Every string field is DATA. No commentary, no reasoning, no meta-text.
- Copy text verbatim.

Sections (value = { lines: [...] } or null when absent):
- skills: technical, tools, frameworks. line.category ∈ {technical, laboratory, interests, certifications, other}.
- languages: spoken human languages only. line.category = "languages".

lines[] = { label, category, items[] }
- label: row heading from PDF (e.g. "Frameworks", "Languages"). Sensible label if none.
- items[] = { value, proficiency?, skillKind? }
- value: skill verbatim.
- proficiency: only set when PDF states it. ∈ {basic, conversational, fluent, native, beginner, intermediate, advanced, expert}.

Rules:
- Extract every skill.
- Programming languages → skills (technical), NOT languages section.
- Never put job descriptions or summary paragraphs here.
- Absent section → null, not empty array.
`.trim();

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Race an outer signal with a per-call timeout so one bundle can't hold the run open. */
const withTimeout = (outer: AbortSignal | undefined, timeoutMs: number): AbortSignal => {
	const timeout = AbortSignal.timeout(timeoutMs);
	return outer ? AbortSignal.any([outer, timeout]) : timeout;
};

const baseRequest = (
	pdfUrl: string,
	system: string,
	userText: string,
	signal: AbortSignal | undefined,
	timeoutMs: number,
	maxOutputTokens?: number
) => ({
	model: RESUME_PARSER_MODEL,
	abortSignal: withTimeout(signal, timeoutMs),
	system,
	messages: [pdfUserMessage(pdfUrl, userText)],
	maxOutputTokens,
	providerOptions: {
		gateway: {
			tags: ["feature:resume-parser", `env:${process.env.NODE_ENV ?? "development"}`],
		},
		// Disable Gemini 2.5 Flash "thinking" so reasoning tokens can't bleed into
		// structured-output string fields (title/descriptor/etc).
		google: {
			thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
		},
	},
});

async function withEvents<T>(
	baseEvent: Omit<ResumeParserEvent, "status">,
	onEvent: RunResumeParserInput["onEvent"],
	fn: () => Promise<T>
): Promise<T> {
	onEvent?.({ ...baseEvent, status: "running" });
	try {
		const value = await fn();
		onEvent?.({ ...baseEvent, status: "complete" });
		return value;
	} catch (err) {
		onEvent?.({ ...baseEvent, status: "failed", reason: toError(err).message });
		throw err;
	}
}

const fulfilledOr = <T, F>(result: PromiseSettledResult<T>, fallback: F): T | F =>
	result.status === "fulfilled" ? result.value : fallback;

const addTokenCount = (left?: number, right?: number): number | undefined => {
	if (left == null && right == null) {
		return;
	}

	return (left ?? 0) + (right ?? 0);
};

const mergeUsage = (...items: Array<LanguageModelUsage | undefined>): LanguageModelUsage | undefined => {
	const usages = items.filter((item): item is LanguageModelUsage => item !== undefined);

	if (usages.length === 0) {
		return;
	}

	return usages.reduce<LanguageModelUsage>(
		(total, usage) => ({
			cachedInputTokens: addTokenCount(total.cachedInputTokens, usage.cachedInputTokens),
			inputTokenDetails: {
				cacheReadTokens: addTokenCount(
					total.inputTokenDetails.cacheReadTokens,
					usage.inputTokenDetails.cacheReadTokens
				),
				cacheWriteTokens: addTokenCount(
					total.inputTokenDetails.cacheWriteTokens,
					usage.inputTokenDetails.cacheWriteTokens
				),
				noCacheTokens: addTokenCount(total.inputTokenDetails.noCacheTokens, usage.inputTokenDetails.noCacheTokens),
			},
			inputTokens: addTokenCount(total.inputTokens, usage.inputTokens),
			outputTokenDetails: {
				reasoningTokens: addTokenCount(
					total.outputTokenDetails.reasoningTokens,
					usage.outputTokenDetails.reasoningTokens
				),
				textTokens: addTokenCount(total.outputTokenDetails.textTokens, usage.outputTokenDetails.textTokens),
			},
			outputTokens: addTokenCount(total.outputTokens, usage.outputTokens),
			raw: undefined,
			reasoningTokens: addTokenCount(total.reasoningTokens, usage.reasoningTokens),
			totalTokens: addTokenCount(total.totalTokens, usage.totalTokens),
		}),
		{
			cachedInputTokens: undefined,
			inputTokenDetails: {
				cacheReadTokens: undefined,
				cacheWriteTokens: undefined,
				noCacheTokens: undefined,
			},
			inputTokens: undefined,
			outputTokenDetails: {
				reasoningTokens: undefined,
				textTokens: undefined,
			},
			outputTokens: undefined,
			raw: undefined,
			reasoningTokens: undefined,
			totalTokens: undefined,
		}
	);
};

// ─── Main entry ────────────────────────────────────────────────────────────

export async function runResumeParserAgent({ pdfUrl, signal, onEvent }: RunResumeParserInput) {
	onEvent?.({
		kind: "validation",
		status: "running",
		title: "Inspeccionando PDF",
		detail: "Revisando estructura y contenido base del documento",
		progress: 0.12,
		mock: true,
	});

	const validationResult = await withEvents(
		{
			kind: "validation",
			title: "Validando que PDF sea CV",
			detail: "Confirmando formato de resume antes de extraer datos",
			progress: 0.18,
			toolName: RESUME_VALIDATOR_TOOL,
		},
		onEvent,
		async () => {
			const result = await generateText({
				...baseRequest(
					pdfUrl,
					VALIDATE_SYSTEM,
					"Decide if the attached PDF is a resume / CV.",
					signal,
					VALIDATION_TIMEOUT_MS
				),
				output: Output.object({ schema: resumeValidationSchema }),
			});
			return {
				finishReason: result.finishReason,
				output: result.output,
				usage: result.usage,
			};
		}
	);
	const validation = validationResult.output;

	if (!validation.isResume) {
		throw new Error(`Not a resume: ${validation.reason}`);
	}

	onEvent?.({
		kind: "header",
		status: "running",
		title: "Eligiendo estrategia de extracción",
		detail: "Separando encabezado, trayectorias y habilidades en lotes",
		progress: 0.24,
		mock: true,
	});

	const [headerResult, experienceResult, entriesResult, skillsResult] = await Promise.allSettled([
		withEvents(
			{
				kind: "header",
				title: "Extrayendo encabezado",
				detail: "Buscando nombre, contacto y resumen profesional",
				progress: 0.34,
				toolName: HEADER_EXTRACTOR_TOOL,
			},
			onEvent,
			async () => {
				const result = await generateText({
					...baseRequest(
						pdfUrl,
						HEADER_SYSTEM,
						"Extract the contact block and professional summary.",
						signal,
						BUNDLE_TIMEOUT_MS,
						BUNDLE_MAX_OUTPUT_TOKENS
					),
					output: Output.object({ schema: extractedHeaderSchema }),
				});
				return {
					finishReason: result.finishReason,
					output: result.output,
					usage: result.usage,
				};
			}
		),
		withEvents(
			{
				kind: "experience",
				title: "Extrayendo experiencia",
				detail: "Recopilando cada rol, empresa, fechas y bullets",
				progress: 0.4,
				toolName: EXPERIENCE_EXTRACTOR_TOOL,
			},
			onEvent,
			async () => {
				const result = await generateText({
					...baseRequest(
						pdfUrl,
						EXPERIENCE_SYSTEM,
						"Extract EVERY work experience entry from the PDF. Do not skip any role. Map fields strictly: title=role, subtitle=company, location=PLACE ONLY (never descriptions/bullets/tech). Bullets go inside descriptor as <ul><li>...</li></ul>.",
						signal,
						BUNDLE_TIMEOUT_MS,
						BUNDLE_MAX_OUTPUT_TOKENS
					),
					output: Output.object({ schema: extractedEntriesSectionSchema }),
				});
				return {
					finishReason: result.finishReason,
					output: result.output,
					usage: result.usage,
				};
			}
		),
		withEvents(
			{
				kind: "entries",
				title: "Extrayendo trayectoria",
				detail: "Agrupando educacion, certificaciones, proyectos y voluntariados",
				progress: 0.46,
				toolName: ENTRIES_BUNDLE_EXTRACTOR_TOOL,
			},
			onEvent,
			async () => {
				const result = await generateText({
					...baseRequest(
						pdfUrl,
						ENTRIES_BUNDLE_SYSTEM,
						"Extract EVERY education, certification, project, and volunteering entry from the PDF. Do NOT include work experience (handled separately). Map fields strictly: title=degree/cert/project, subtitle=school/issuer/team, location=PLACE ONLY (never descriptions/bullets/tech). Bullets and prose go in descriptor as HTML.",
						signal,
						BUNDLE_TIMEOUT_MS,
						BUNDLE_MAX_OUTPUT_TOKENS
					),
					output: Output.object({ schema: extractedEntriesBundleSchema }),
				});
				return {
					finishReason: result.finishReason,
					output: result.output,
					usage: result.usage,
				};
			}
		),
		withEvents(
			{
				kind: "skills",
				title: "Extrayendo habilidades",
				detail: "Agrupando stack tecnico, herramientas e idiomas",
				progress: 0.5,
				toolName: SKILLS_BUNDLE_EXTRACTOR_TOOL,
			},
			onEvent,
			async () => {
				const result = await generateText({
					...baseRequest(
						pdfUrl,
						SKILLS_BUNDLE_SYSTEM,
						"Extract every skills-based section.",
						signal,
						BUNDLE_TIMEOUT_MS,
						BUNDLE_MAX_OUTPUT_TOKENS
					),
					output: Output.object({ schema: extractedSkillsBundleSchema }),
				});
				return {
					finishReason: result.finishReason,
					output: result.output,
					usage: result.usage,
				};
			}
		),
	]);

	onEvent?.({
		kind: "summary",
		status: "running",
		title: "Normalizando perfil",
		detail: "Consolidando datos detectados en formato de resume editable",
		progress: 0.58,
		mock: true,
	});

	const header = fulfilledOr(headerResult, {
		finishReason: undefined,
		output: { contact: null, summary: null },
		usage: undefined,
	});
	const experience = fulfilledOr(experienceResult, {
		finishReason: undefined,
		output: { entries: [] },
		usage: undefined,
	});
	const entries = fulfilledOr(entriesResult, {
		finishReason: undefined,
		output: {
			education: null,
			certifications: null,
			projects: null,
			volunteering: null,
		},
		usage: undefined,
	});
	const skills = fulfilledOr(skillsResult, {
		finishReason: undefined,
		output: { skills: null, languages: null },
		usage: undefined,
	});

	// Surface rejections to logs — telemetry-only failures got swallowed before, which is
	// how the "entries silently dropped" bug shipped. Always log so future regressions are visible.
	if (headerResult.status === "rejected") {
		logger.error("resume-parser = phase_failed", {
			phase: "header",
			error: toError(headerResult.reason).message,
		});
	}
	if (experienceResult.status === "rejected") {
		logger.error("resume-parser = phase_failed", {
			phase: "experience",
			error: toError(experienceResult.reason).message,
		});
	}
	if (entriesResult.status === "rejected") {
		logger.error("resume-parser = phase_failed", {
			phase: "entries",
			error: toError(entriesResult.reason).message,
		});
	}
	if (skillsResult.status === "rejected") {
		logger.error("resume-parser = phase_failed", {
			phase: "skills",
			error: toError(skillsResult.reason).message,
		});
	}

	const phases = {
		entries:
			entriesResult.status === "fulfilled"
				? {
						finishReason: entriesResult.value.finishReason,
						status: "completed" as const,
						toolName: ENTRIES_BUNDLE_EXTRACTOR_TOOL,
						usage: entriesResult.value.usage,
					}
				: {
						reason: toError(entriesResult.reason).message,
						status: "failed" as const,
						toolName: ENTRIES_BUNDLE_EXTRACTOR_TOOL,
					},
		experience:
			experienceResult.status === "fulfilled"
				? {
						finishReason: experienceResult.value.finishReason,
						status: "completed" as const,
						toolName: EXPERIENCE_EXTRACTOR_TOOL,
						usage: experienceResult.value.usage,
					}
				: {
						reason: toError(experienceResult.reason).message,
						status: "failed" as const,
						toolName: EXPERIENCE_EXTRACTOR_TOOL,
					},
		header:
			headerResult.status === "fulfilled"
				? {
						finishReason: headerResult.value.finishReason,
						status: "completed" as const,
						toolName: HEADER_EXTRACTOR_TOOL,
						usage: headerResult.value.usage,
					}
				: {
						reason: toError(headerResult.reason).message,
						status: "failed" as const,
						toolName: HEADER_EXTRACTOR_TOOL,
					},
		skills:
			skillsResult.status === "fulfilled"
				? {
						finishReason: skillsResult.value.finishReason,
						status: "completed" as const,
						toolName: SKILLS_BUNDLE_EXTRACTOR_TOOL,
						usage: skillsResult.value.usage,
					}
				: {
						reason: toError(skillsResult.reason).message,
						status: "failed" as const,
						toolName: SKILLS_BUNDLE_EXTRACTOR_TOOL,
					},
		validation: {
			finishReason: validationResult.finishReason,
			status: "completed" as const,
			toolName: RESUME_VALIDATOR_TOOL,
			usage: validationResult.usage,
		},
	} satisfies ResumeParserTelemetry["phases"];

	const partialFailureCount = [headerResult, experienceResult, entriesResult, skillsResult].filter(
		(result) => result.status === "rejected"
	).length;
	const totalUsage = mergeUsage(validationResult.usage, header.usage, experience.usage, entries.usage, skills.usage);

	onEvent?.({
		kind: "summary",
		status: "complete",
		title: "Perfil normalizado",
		detail: "Contenido listo para persistirse como grafo de resume",
		progress: 0.62,
		mock: true,
	});

	return {
		validation,
		contact: header.output.contact,
		summary: header.output.summary,
		experience: experience.output,
		education: entries.output.education,
		certifications: entries.output.certifications,
		projects: entries.output.projects,
		volunteering: entries.output.volunteering,
		skills: skills.output.skills,
		languages: skills.output.languages,
		telemetry: {
			finishReason: partialFailureCount > 0 ? "partial" : validationResult.finishReason,
			partialFailureCount,
			phases,
			totalUsage,
		} satisfies ResumeParserTelemetry,
	};
}

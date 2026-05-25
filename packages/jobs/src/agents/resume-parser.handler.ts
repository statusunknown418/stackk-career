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

export const RESUME_PARSER_MODEL = "google/gemini-2.5-flash" satisfies LanguageModel;
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
You are a resume validator. Inspect the attached PDF and decide if it is a resume / CV.

Return JSON conforming to the schema:
- isResume: true only when the document is clearly a personal resume / CV (sections like experience, education, skills, contact details).
- confidence: 0.0 to 1.0 (your confidence in the decision).
- candidateName: full name if found, else null.
- reason: short, factual justification grounded in observed content.

Reject (isResume=false) for: invoices, contracts, articles, syllabi, generic documents, blank PDFs.
`.trim();

const HEADER_SYSTEM = `
Extract the candidate's header info from the attached resume PDF. Return BOTH fields in one JSON object.

CRITICAL RULES:
- Copy text VERBATIM from the PDF. Do not paraphrase, translate, or "clean up".
- If a field is not present, return null / omit it. NEVER invent data.
- The "summary" is the candidate's professional summary / objective / profile paragraph near the top of the resume. It is NOT a job description, NOT a bullet list, NOT skills.

contact:
- firstName / lastName: split the full name. Use empty string if missing.
- items: array of { kind, value, label? } where kind ∈ {address, email, phone, linkedin, website, other}.
  - address: full postal / city-state-country line ONLY. Not a workplace location.
  - email: a valid email address.
  - phone: phone number as written (keep formatting).
  - linkedin: linkedin.com profile URL or handle.
  - website: any other URL (portfolio, github, personal site). Use "other" if unsure.
- Return null when zero contact info is found.

summary:
- paragraphs: one or more { text, format } blocks. Default format "html".
- Wrap each paragraph's text in a single <p>...</p> when format is "html".
- Only include a real summary / objective / profile paragraph. If absent → return null (NOT an empty paragraphs array).
- Never put bullet lists, job descriptions, or skill lines into summary.
`.trim();

const EXPERIENCE_SYSTEM = `
Extract EVERY work experience entry from the attached resume PDF.

═══ EXHAUSTIVENESS — READ FIRST ═══
- Extract EVERY job, role, internship, contract, and freelance engagement in the PDF.
- If the resume lists 9 jobs, return 9 entries. NEVER skip an entry because "it looks similar".
- Preserve the PDF's order (most-recent first is typical — keep that order).

Return { entries: [...] }. If the PDF contains zero work experience, return { entries: [] }.

═══ FIELD SEMANTICS — STRICT ═══
Be literal: copy text verbatim from the PDF; do NOT paraphrase.

- title    = job position / role (e.g. "Senior Software Engineer").
- subtitle = company / employer name (e.g. "Acme Corp").
- location = city, region, country ONLY (e.g. "Lima, Peru" / "Remote" / "New York, NY"). NEVER job duties, descriptions, or bullets.
- isRemote = true when the role is explicitly remote.

═══ HARD RULES — LOCATION ═══
- location is a PLACE STRING. Max ~60 chars.
- If the only candidate text is descriptive (responsibilities, achievements, tools, summary), omit location entirely.
- "Remote" / "Hybrid" → set isRemote=true and also put "Remote" / "Hybrid" in location.
- Never copy a sentence into location. If you would need a period, it's not a location.

═══ DATES ═══
- startDate / endDate as "YYYY-MM" (omit endDate when the role is ongoing).
- isCurrent = true ONLY when the role is ongoing (text says "Present", "Current", "Now"). When true, endDate must be null/omitted.
- Years-only sources → use "YYYY-01" for startDate, "YYYY-12" for endDate as a best-effort. Omit a date when truly absent.

═══ DESCRIPTOR (entry body) ═══
- descriptor holds the entry's narrative as HTML. descriptorFormat="html". entryStyle="standard".
- Bullet lists in the source → ONE <ul><li>...</li><li>...</li></ul> block. Never wrap individual bullets in <p>.
- Free-form prose paragraphs go in <p>...</p> BEFORE the list, in document order.
- Allowed tags ONLY: p, ul, ol, li, strong, em, b, i, br. Strip any other markup.
- Copy bullet text verbatim. Do not summarize, translate, or merge bullets.
- If the entry has no body text in the PDF, omit descriptor (do NOT fabricate one, do NOT echo title/subtitle).

═══ ANTI-PATTERNS (never do this) ═══
- ❌ location: "Led migration of legacy auth system to OAuth2..."   (bullet — goes in descriptor)
- ❌ location: "Python, AWS, Kubernetes"                            (skills — drop entirely)
- ❌ subtitle: "Acme Corp — Remote — 2020-2023"                     (split: subtitle=company, location=Remote, dates separately)
- ❌ descriptor echoing the title or subtitle
- ❌ skipping an entry because "it looks similar to another"
`.trim();

const ENTRIES_BUNDLE_SYSTEM = `
Extract every non-experience entries-based section from the attached resume PDF in ONE JSON object.

═══ EXHAUSTIVENESS — READ FIRST ═══
- Extract EVERY entry in the PDF for the sections below. Do not skip degrees, certifications, or projects.
- Preserve the PDF's order. Never duplicate an entry across sections.
- WORK EXPERIENCE is handled by a separate extractor — do NOT include jobs / employment / freelance engagements here.

═══ SECTIONS ═══
- education: EDUCATION — degrees, schools, bootcamps, formal studies.
- certifications: CERTIFICATIONS / licenses / professional credentials.
- projects: PROJECTS — personal, academic, or notable side projects.
- volunteering: VOLUNTEERING / community involvement / pro bono work.

Each section's value is { entries: [...] } or null when that section is genuinely absent from the PDF.

═══ FIELD SEMANTICS — STRICT ═══
Map fields per section. Be literal: copy text verbatim from the PDF; do NOT paraphrase.

education entry:
- title    = degree or program (e.g. "B.Sc. Computer Science").
- subtitle = institution / school name (e.g. "MIT").
- location = city / country of the institution. NEVER coursework or honors.

certifications entry:
- title    = certification name (e.g. "AWS Solutions Architect Associate").
- subtitle = issuing organization (e.g. "Amazon Web Services").
- location = omit unless the PDF explicitly states a place. NEVER a credential ID or score.

projects entry:
- title    = project name.
- subtitle = role / context / team (e.g. "Personal project", "Capstone — Team of 4"). May be omitted.
- location = omit unless the PDF states one. NEVER tech stack or description.

volunteering entry:
- title    = role / position held.
- subtitle = organization name.
- location = city / country only.

═══ HARD RULES — LOCATION ═══
- location is a PLACE STRING. Max ~60 chars.
- If the only candidate text is descriptive (responsibilities, achievements, tools, summary), omit location entirely.
- Never copy a sentence into location. If you would need a period, it's not a location.

═══ DATES ═══
- startDate / endDate as "YYYY-MM" (omit endDate when ongoing).
- isCurrent = true ONLY when the entry is ongoing. When true, endDate must be null/omitted.
- Years-only sources → use "YYYY-01" for startDate, "YYYY-12" for endDate as a best-effort. Omit a date when truly absent.

═══ DESCRIPTOR (entry body) ═══
- descriptor holds the entry's narrative as HTML. descriptorFormat="html". entryStyle="standard".
- Bullet lists in the source → ONE <ul><li>...</li><li>...</li></ul> block. Never wrap individual bullets in <p>.
- Free-form prose paragraphs go in <p>...</p> BEFORE the list, in document order.
- Allowed tags ONLY: p, ul, ol, li, strong, em, b, i, br. Strip any other markup.
- Copy bullet text verbatim. Do not summarize, translate, or merge bullets.
- If the entry has no body text in the PDF, omit descriptor.

Return null (NOT an empty entries array) for sections absent from the PDF.
`.trim();

const SKILLS_BUNDLE_SYSTEM = `
Extract every skills-based section from the attached resume PDF in ONE JSON object.

Sections:
- skills: technical / tools / frameworks. Use any of {technical, laboratory, interests, certifications, other} per line.category.
- languages: spoken human languages (English, Spanish, etc.). Every line.category MUST be "languages".

Each section's value is { lines: [...] } or null when the section is genuinely absent.

lines[] shape: { label, category, items[] }
- label = the row's heading from the PDF (e.g. "Languages", "Frameworks", "Cloud"). Use a sensible label when the PDF lists skills without sub-headings.
- items[] shape: { value, proficiency?, skillKind? }
- value = the skill as written in the PDF (verbatim).
- proficiency ∈ {basic, conversational, fluent, native, beginner, intermediate, advanced, expert}. Only set when the PDF states it.

RULES:
- Extract every skill listed. Do not drop items even if the line is long.
- Never put job descriptions, certifications text, or summary paragraphs in skills.
- Programming languages go in skills (technical), NOT in the languages section.
- Return null (not an empty lines array) for sections absent from the PDF.
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

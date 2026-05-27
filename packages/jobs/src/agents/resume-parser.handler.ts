/**
 * Resume parser agent — orchestrator-workers architecture.
 *
 * Phase 1: validate the PDF is a resume (gate — throws if not).
 * Phase 2 (in parallel after validation):
 *   - header bundle    : contact + summary       [streamText, 1 call]
 *   - skills bundle    : skills + languages      [streamText, 1 call]
 *   - entries pipeline :
 *       outline pass   : list every entry-shaped block in the PDF  [1 call]
 *       fan-out workers: extract each entry in isolation           [N parallel calls]
 *       reconciler     : retry workers w/ empty descriptor         [≤ N retry calls]
 *
 * Every call uses `streamText` so progress is observable through Trigger's
 * realtime stream + chain-of-thought UI. Per-call timeouts layer on top of the
 * outer task signal so a single stuck phase can't hold the run open.
 *
 * The PDF is attached with Anthropic `cache_control: ephemeral` so the
 * provider caches the (system + PDF) prefix across the N worker calls — input
 * tokens get ~90% cheaper after the first hit within ~5 minutes.
 *
 * Return shape stays identical to the previous version so `planSections` and
 * `insert-blocks` are untouched.
 */

import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import {
	extractedHeaderSchema,
	extractedSkillsBundleSchema,
	type ParserEntry,
	parserEntryContentSchema,
	type ResumeOutlineItem,
	type ResumeOutlineKind,
	type ResumeParserPhase,
	type ResumeParserPhaseStatus,
	type ResumeParserStep,
	resumeOutlineSchema,
	resumeValidationSchema,
} from "@stackk-career/schemas/jobs/resume-parser";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { logger } from "@trigger.dev/sdk";
import { type FinishReason, type LanguageModel, type LanguageModelUsage, Output, streamText } from "ai";
import type { z } from "zod";
import { fetchPdfBytes, pdfUserMessage } from "../lib/ai/pdf-message";

// ─── Public surface ────────────────────────────────────────────────────────

export const RESUME_PARSER_MODEL = "anthropic/claude-haiku-4.5" satisfies LanguageModel;
export const RESUME_PARSER_OBJECT_TYPE = "resume-parser";

export const RESUME_VALIDATOR_TOOL = "resume_validator";
export const OUTLINE_EXTRACTOR_TOOL = "outline_extractor";
export const HEADER_EXTRACTOR_TOOL = "header_extractor";
export const ENTRY_WORKER_TOOL = "entry_extractor";
export const ENTRY_RECONCILER_TOOL = "entry_reconciler";
export const SKILLS_BUNDLE_EXTRACTOR_TOOL = "skills_bundle_extractor";

// Per-call timeouts. Validation = tiny output, fast. Outline = small JSON, fast.
// Workers are narrow (single entry) so 90s is plenty. Header/skills bundles can
// emit larger nested JSON → keep 4 min from the previous bundle setup.
const VALIDATION_TIMEOUT_MS = Number(process.env.RESUME_PARSER_VALIDATION_TIMEOUT_MS ?? 30 * 1000);
const OUTLINE_TIMEOUT_MS = Number(process.env.RESUME_PARSER_OUTLINE_TIMEOUT_MS ?? 60 * 1000);
const WORKER_TIMEOUT_MS = Number(process.env.RESUME_PARSER_WORKER_TIMEOUT_MS ?? 90 * 1000);
const BUNDLE_TIMEOUT_MS = Number(process.env.RESUME_PARSER_BUNDLE_TIMEOUT_MS ?? 4 * 60 * 1000);

// Bundle calls emit large nested JSON. Without a cap the provider default
// truncates long outputs → JSON parse fails → section disappears silently.
const BUNDLE_MAX_OUTPUT_TOKENS = Number(process.env.RESUME_PARSER_MAX_OUTPUT_TOKENS ?? 16_000);
const WORKER_MAX_OUTPUT_TOKENS = Number(process.env.RESUME_PARSER_WORKER_MAX_OUTPUT_TOKENS ?? 3000);

// Cap reconciler retries so a malformed PDF can't fan out forever.
const MAX_RECONCILER_RETRIES = Number(process.env.RESUME_PARSER_MAX_RECONCILER_RETRIES ?? 6);

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
	outlineItemCount: number;
	partialFailureCount: number;
	phases: Record<
		| "certifications"
		| "education"
		| "experience"
		| "header"
		| "outline"
		| "projects"
		| "skills"
		| "validation"
		| "volunteering",
		ResumeParserPhaseTelemetry
	>;
	reconcilerRetries: number;
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
Extract the candidate's header info from the attached resume PDF.

- Copy text verbatim. No paraphrasing, no translation, no cleanup.
- String fields hold DATA only — never commentary, reasoning, or meta-text.
- Missing data → null / omit per the schema. Never invent.
`.trim();

const SKILLS_BUNDLE_SYSTEM = `
Extract skills and languages from the attached resume PDF.

- Copy text verbatim. No paraphrasing.
- String fields hold DATA only — never commentary, reasoning, or meta-text.
- Extract every skill listed. Do not drop items.
- Programming languages go in skills (technical), NOT in the languages section.
- Never put job descriptions, certification text, or summary paragraphs into skills.
- Missing section → null per the schema. Never invent.
`.trim();

const OUTLINE_SYSTEM = `
Enumerate every entry-shaped block in the attached resume PDF.

Goal: produce a CHECKLIST of entries so downstream workers can extract each one in isolation.

Each item:
- kind: experience | education | certification | project | volunteering.
- title: primary heading verbatim (job role, degree, cert name, project name, volunteer role).
- subtitle: company / school / issuer / team / organization verbatim. Omit when truly absent.
- dateRangeRaw: date range as written verbatim (e.g. "Jul 2022 - Present"). Omit when no date range.

Hard rules:
- Include EVERY entry, no matter how short or how sparse.
- Preserve PDF document order.
- Over-report is preferred to skipping. Duplicates are filtered downstream.
- Do NOT include bullets, descriptions, locations, or commentary. The outline is HEADERS only.
- Do NOT include header info, summary, skills, or languages.
`.trim();

const WORKER_SYSTEM = `
Extract ONE specific entry from the attached resume PDF.

You are given the entry's TITLE, SUBTITLE, and DATES as a locator. Find that exact entry in the PDF and extract its full data.

Hard rules:
- Copy text verbatim. No paraphrasing, no translation, no cleanup.
- String fields hold DATA only — never commentary, reasoning, or meta-text.
- Bullets from the source PDF → one <ul><li>...</li></ul> block inside descriptor.
- Paragraphs from the source PDF → <p>...</p> before any bullet list.
- Allowed HTML tags in descriptor: p, ul, ol, li, strong, em, b, i, br. Nothing else.
- title MUST be the role/degree/cert/project/volunteer-role. subtitle MUST be the company/school/issuer/team/organization.
- location is a PLACE only (city/region/country/remote). NEVER duties, bullets, tech stack.
- Map dates to YYYY-MM. Year-only → YYYY-12. If the PDF says "Present"/"Actual"/"Current", set isCurrent=true and omit endDate.
- Return EXACTLY ONE entry matching the locator. If the locator points to body content (bullets/dates/location below the header), include ALL of it.
- Missing data → null / omit per the schema. Never invent.

ANTI-HALLUCINATION:
- The returned 'title' MUST match the locator's TITLE (token-for-token, ignoring case/punctuation). Do NOT return a different entry.
- The returned 'subtitle' MUST match the locator's SUBTITLE when one is given.
- If you CANNOT find the locator's entry in the PDF, return the locator's title/subtitle verbatim with descriptor omitted and all dates omitted — DO NOT substitute a different entry, DO NOT invent body text, DO NOT merge data from neighboring entries.
`.trim();

const RECONCILER_SYSTEM = `
${WORKER_SYSTEM}

PREVIOUS EXTRACTION FAILED to capture the entry body OR returned a different entry than the locator. The PDF likely contains bullets and / or a description paragraph below the header for THIS exact entry. Re-locate by the locator's title + subtitle + dates, read the body carefully, and emit a complete descriptor (HTML) plus any dates/location you missed before. If the locator's entry truly does not exist in the PDF, return it with descriptor omitted — never substitute.
`.trim();

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Race an outer signal with a per-call timeout so one phase can't hold the run open. */
const withTimeout = (outer: AbortSignal | undefined, timeoutMs: number): AbortSignal => {
	const timeout = AbortSignal.timeout(timeoutMs);
	return outer ? AbortSignal.any([outer, timeout]) : timeout;
};

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

// Outline `kind` (singular) → planSections section kind (plural for some).
const SECTION_KIND_BY_OUTLINE: Record<
	ResumeOutlineKind,
	"certifications" | "education" | "experience" | "projects" | "volunteering"
> = {
	experience: "experience",
	education: "education",
	certification: "certifications",
	project: "projects",
	volunteering: "volunteering",
};

const outlineItemKey = (item: ResumeOutlineItem) =>
	[
		item.kind,
		item.title.trim().toLowerCase(),
		(item.subtitle ?? "").trim().toLowerCase(),
		(item.dateRangeRaw ?? "").trim().toLowerCase(),
	].join("|");

const dedupeOutlineItems = (items: ResumeOutlineItem[]): ResumeOutlineItem[] =>
	items.reduce<{ seen: Set<string>; out: ResumeOutlineItem[] }>(
		(acc, item) => {
			const key = outlineItemKey(item);
			if (!acc.seen.has(key)) {
				acc.seen.add(key);
				acc.out.push(item);
			}
			return acc;
		},
		{ seen: new Set<string>(), out: [] }
	).out;

const isEntryBodyEmpty = (entry: ParserEntry): boolean => {
	const descriptor = entry.descriptor?.replace(/<[^>]+>/g, "").trim() ?? "";
	return descriptor.length === 0;
};

/**
 * Run a streaming structured-output call.
 *
 * Consumes the fullStream solely to drive cancellation + finishing — the
 * structured `output` resolves only after the stream terminates. Keeping the
 * stream attached (vs. ignoring it) lets the AI SDK propagate provider events
 * (text-delta, tool-call, finish) into Trigger's tracing layer, so the chain
 * of thought sees real progress per phase instead of synthetic boundaries.
 */
async function runStreamingPhase<T>(opts: {
	maxOutputTokens?: number;
	pdfData: Uint8Array;
	schema: z.ZodType<T>;
	signal: AbortSignal | undefined;
	system: string;
	timeoutMs: number;
	userText: string;
}): Promise<{ finishReason: FinishReason; output: T; usage: LanguageModelUsage }> {
	const { schema, system, userText, pdfData, signal, timeoutMs, maxOutputTokens } = opts;

	const result = streamText({
		model: RESUME_PARSER_MODEL,
		abortSignal: withTimeout(signal, timeoutMs),
		system,
		messages: [pdfUserMessage(pdfData, [userText], { cachePdf: true })],
		maxOutputTokens,
		output: Output.object({ schema }),
		providerOptions: {
			gateway: {
				tags: ["feature:resume-parser", `env:${process.env.NODE_ENV ?? "development"}`],
			},
		},
	});

	// Drain the fullStream so the AI SDK can forward provider events to telemetry.
	// We don't surface text-deltas as user events here — call boundaries (running /
	// complete / failed) plus per-worker granularity already give the UI plenty of
	// resolution. Future: tap text-delta for live "thinking" UI when desired.
	for await (const _chunk of result.fullStream) {
		// no-op — iteration drives the stream to completion
	}

	const output = (await result.output) as T;
	const usage = await result.totalUsage;
	const finishReason = await result.finishReason;
	return { finishReason, output, usage };
}

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

// ─── Worker + reconciler ───────────────────────────────────────────────────

interface WorkerResult {
	entry: ParserEntry;
	finishReason?: FinishReason;
	item: ResumeOutlineItem;
	reconciled: boolean;
	usage?: LanguageModelUsage;
}

const buildWorkerUserText = (item: ResumeOutlineItem) =>
	[
		"Locate and extract this ONE entry from the PDF. The locator below is the contract — your output must point to the SAME entry the locator points to.",
		"",
		"LOCATOR:",
		`- section:  ${item.kind}`,
		`- title:    "${item.title}"`,
		`- subtitle: ${item.subtitle ? `"${item.subtitle}"` : "(absent)"}`,
		`- dates:    ${item.dateRangeRaw ? `"${item.dateRangeRaw}"` : "(absent)"}`,
		"",
		"Required output:",
		`- entry.title MUST be exactly "${item.title}" as it appears in the PDF (verbatim, same words, same order).`,
		item.subtitle
			? `- entry.subtitle MUST be exactly "${item.subtitle}" as it appears in the PDF.`
			: "- entry.subtitle: copy verbatim from the PDF when present, otherwise omit.",
		"- Include every bullet, date, and location physically attached to THIS entry's header in the PDF.",
		"- If you cannot find the locator's entry in the PDF: return the locator's title/subtitle verbatim, omit descriptor and all dates. Do NOT substitute a neighboring entry. Do NOT merge data from another entry. Do NOT invent body text.",
	].join("\n");

async function extractEntryWorker(
	item: ResumeOutlineItem,
	pdfData: Uint8Array,
	signal: AbortSignal | undefined,
	onEvent: RunResumeParserInput["onEvent"]
): Promise<WorkerResult> {
	const kindKey = SECTION_KIND_BY_OUTLINE[item.kind];
	const baseEvent: Omit<ResumeParserEvent, "status"> = {
		kind: kindKey,
		title: `Extrayendo: ${item.title}`,
		detail: item.subtitle ? `${item.subtitle}${item.dateRangeRaw ? ` · ${item.dateRangeRaw}` : ""}` : item.dateRangeRaw,
		toolName: ENTRY_WORKER_TOOL,
	};

	const result = await withEvents(baseEvent, onEvent, async () =>
		runStreamingPhase({
			pdfData,
			schema: parserEntryContentSchema,
			signal,
			system: WORKER_SYSTEM,
			timeoutMs: WORKER_TIMEOUT_MS,
			userText: buildWorkerUserText(item),
			maxOutputTokens: WORKER_MAX_OUTPUT_TOKENS,
		})
	);

	return {
		entry: result.output,
		finishReason: result.finishReason,
		item,
		reconciled: false,
		usage: result.usage,
	};
}

async function reconcileEntry(
	item: ResumeOutlineItem,
	pdfData: Uint8Array,
	signal: AbortSignal | undefined,
	onEvent: RunResumeParserInput["onEvent"]
): Promise<WorkerResult> {
	const kindKey = SECTION_KIND_BY_OUTLINE[item.kind];
	const baseEvent: Omit<ResumeParserEvent, "status"> = {
		kind: kindKey,
		title: `Reintentando: ${item.title}`,
		detail: "Reextrayendo bullets y detalles que se perdieron",
		toolName: ENTRY_RECONCILER_TOOL,
	};

	const result = await withEvents(baseEvent, onEvent, async () =>
		runStreamingPhase({
			pdfData,
			schema: parserEntryContentSchema,
			signal,
			system: RECONCILER_SYSTEM,
			timeoutMs: WORKER_TIMEOUT_MS,
			userText: buildWorkerUserText(item),
			maxOutputTokens: WORKER_MAX_OUTPUT_TOKENS,
		})
	);

	return {
		entry: result.output,
		finishReason: result.finishReason,
		item,
		reconciled: true,
		usage: result.usage,
	};
}

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

	const pdfData = await fetchPdfBytes(pdfUrl, signal);

	// 1) Validation — gate the rest of the pipeline.
	const validationResult = await withEvents(
		{
			kind: "validation",
			title: "Validando que PDF sea CV",
			detail: "Confirmando formato de resume antes de extraer datos",
			progress: 0.18,
			toolName: RESUME_VALIDATOR_TOOL,
		},
		onEvent,
		() =>
			runStreamingPhase({
				pdfData,
				schema: resumeValidationSchema,
				signal,
				system: VALIDATE_SYSTEM,
				timeoutMs: VALIDATION_TIMEOUT_MS,
				userText: "Decide if the attached PDF is a resume / CV.",
			})
	);
	const validation = validationResult.output;

	if (!validation.isResume) {
		throw new Error(`Not a resume: ${validation.reason}`);
	}

	onEvent?.({
		kind: "header",
		status: "running",
		title: "Eligiendo estrategia de extracción",
		detail: "Encabezado, habilidades y trayectoria en paralelo",
		progress: 0.24,
		mock: true,
	});

	// 2) Three independent branches run in parallel:
	//    - header bundle (contact + summary)
	//    - skills bundle (skills + languages)
	//    - entries pipeline (outline → workers → reconciler)
	const [headerResult, skillsResult, entriesPipelineResult] = await Promise.allSettled([
		withEvents(
			{
				kind: "header",
				title: "Extrayendo encabezado",
				detail: "Buscando nombre, contacto y resumen profesional",
				progress: 0.34,
				toolName: HEADER_EXTRACTOR_TOOL,
			},
			onEvent,
			() =>
				runStreamingPhase({
					pdfData,
					schema: extractedHeaderSchema,
					signal,
					system: HEADER_SYSTEM,
					timeoutMs: BUNDLE_TIMEOUT_MS,
					userText: "Extract the contact block and professional summary.",
					maxOutputTokens: BUNDLE_MAX_OUTPUT_TOKENS,
				})
		),
		withEvents(
			{
				kind: "skills",
				title: "Extrayendo habilidades",
				detail: "Agrupando stack técnico, herramientas e idiomas",
				progress: 0.5,
				toolName: SKILLS_BUNDLE_EXTRACTOR_TOOL,
			},
			onEvent,
			() =>
				runStreamingPhase({
					pdfData,
					schema: extractedSkillsBundleSchema,
					signal,
					system: SKILLS_BUNDLE_SYSTEM,
					timeoutMs: BUNDLE_TIMEOUT_MS,
					userText: "Extract every skills-based section.",
					maxOutputTokens: BUNDLE_MAX_OUTPUT_TOKENS,
				})
		),
		runEntriesPipeline({ pdfData, signal, onEvent }),
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
	const skills = fulfilledOr(skillsResult, {
		finishReason: undefined,
		output: { skills: null, languages: null },
		usage: undefined,
	});
	const entriesPipeline = fulfilledOr(entriesPipelineResult, EMPTY_ENTRIES_PIPELINE);

	if (headerResult.status === "rejected") {
		logger.error("resume-parser = phase_failed", {
			phase: "header",
			error: toError(headerResult.reason).message,
		});
	}
	if (skillsResult.status === "rejected") {
		logger.error("resume-parser = phase_failed", {
			phase: "skills",
			error: toError(skillsResult.reason).message,
		});
	}
	if (entriesPipelineResult.status === "rejected") {
		logger.error("resume-parser = phase_failed", {
			phase: "entries_pipeline",
			error: toError(entriesPipelineResult.reason).message,
		});
	}

	const phases: ResumeParserTelemetry["phases"] = {
		validation: {
			finishReason: validationResult.finishReason,
			status: "completed",
			toolName: RESUME_VALIDATOR_TOOL,
			usage: validationResult.usage,
		},
		header:
			headerResult.status === "fulfilled"
				? {
						finishReason: headerResult.value.finishReason,
						status: "completed",
						toolName: HEADER_EXTRACTOR_TOOL,
						usage: headerResult.value.usage,
					}
				: {
						reason: toError(headerResult.reason).message,
						status: "failed",
						toolName: HEADER_EXTRACTOR_TOOL,
					},
		skills:
			skillsResult.status === "fulfilled"
				? {
						finishReason: skillsResult.value.finishReason,
						status: "completed",
						toolName: SKILLS_BUNDLE_EXTRACTOR_TOOL,
						usage: skillsResult.value.usage,
					}
				: {
						reason: toError(skillsResult.reason).message,
						status: "failed",
						toolName: SKILLS_BUNDLE_EXTRACTOR_TOOL,
					},
		outline: entriesPipeline.phases.outline,
		experience: entriesPipeline.phases.experience,
		education: entriesPipeline.phases.education,
		certifications: entriesPipeline.phases.certifications,
		projects: entriesPipeline.phases.projects,
		volunteering: entriesPipeline.phases.volunteering,
	};

	const partialFailureCount = [
		headerResult,
		skillsResult,
		entriesPipelineResult,
		...entriesPipeline.failedWorkers.map(() => ({ status: "rejected" as const })),
	].filter((result) => result.status === "rejected").length;

	const totalUsage = mergeUsage(validationResult.usage, header.usage, skills.usage, ...entriesPipeline.usages);

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
		experience: { entries: entriesPipeline.entries.experience },
		education: entriesPipeline.entries.education.length > 0 ? { entries: entriesPipeline.entries.education } : null,
		certifications:
			entriesPipeline.entries.certifications.length > 0 ? { entries: entriesPipeline.entries.certifications } : null,
		projects: entriesPipeline.entries.projects.length > 0 ? { entries: entriesPipeline.entries.projects } : null,
		volunteering:
			entriesPipeline.entries.volunteering.length > 0 ? { entries: entriesPipeline.entries.volunteering } : null,
		skills: skills.output.skills,
		languages: skills.output.languages,
		telemetry: {
			finishReason: partialFailureCount > 0 ? "partial" : validationResult.finishReason,
			outlineItemCount: entriesPipeline.outlineItemCount,
			partialFailureCount,
			phases,
			reconcilerRetries: entriesPipeline.reconcilerRetries,
			totalUsage,
		} satisfies ResumeParserTelemetry,
	};
}

// ─── Entries pipeline (orchestrator + workers + reconciler) ────────────────

interface EntriesPipelineResult {
	entries: Record<"certifications" | "education" | "experience" | "projects" | "volunteering", ParserEntry[]>;
	failedWorkers: ResumeOutlineItem[];
	outlineItemCount: number;
	phases: Pick<
		ResumeParserTelemetry["phases"],
		"certifications" | "education" | "experience" | "outline" | "projects" | "volunteering"
	>;
	reconcilerRetries: number;
	usages: Array<LanguageModelUsage | undefined>;
}

const EMPTY_ENTRIES_PIPELINE: EntriesPipelineResult = {
	entries: { experience: [], education: [], certifications: [], projects: [], volunteering: [] },
	failedWorkers: [],
	outlineItemCount: 0,
	phases: {
		outline: { status: "failed", toolName: OUTLINE_EXTRACTOR_TOOL, reason: "pipeline did not run" },
		experience: { status: "failed", toolName: ENTRY_WORKER_TOOL, reason: "pipeline did not run" },
		education: { status: "failed", toolName: ENTRY_WORKER_TOOL, reason: "pipeline did not run" },
		certifications: { status: "failed", toolName: ENTRY_WORKER_TOOL, reason: "pipeline did not run" },
		projects: { status: "failed", toolName: ENTRY_WORKER_TOOL, reason: "pipeline did not run" },
		volunteering: { status: "failed", toolName: ENTRY_WORKER_TOOL, reason: "pipeline did not run" },
	},
	reconcilerRetries: 0,
	usages: [],
};

async function runEntriesPipeline({
	pdfData,
	signal,
	onEvent,
}: {
	onEvent: RunResumeParserInput["onEvent"];
	pdfData: Uint8Array;
	signal: AbortSignal | undefined;
}): Promise<EntriesPipelineResult> {
	const outlineResult = await withEvents(
		{
			kind: "outline",
			title: "Trazando trayectoria",
			detail: "Identificando cada experiencia, estudio, proyecto y certificación",
			progress: 0.28,
			toolName: OUTLINE_EXTRACTOR_TOOL,
		},
		onEvent,
		() =>
			runStreamingPhase({
				pdfData,
				schema: resumeOutlineSchema,
				signal,
				system: OUTLINE_SYSTEM,
				timeoutMs: OUTLINE_TIMEOUT_MS,
				userText:
					"List every entry-shaped block in the PDF (jobs, degrees, certs, projects, volunteering). Headers only — no bullets or descriptions.",
			})
	);

	const items = dedupeOutlineItems(outlineResult.output.items);
	const entriesByKind: Record<
		"certifications" | "education" | "experience" | "projects" | "volunteering",
		ParserEntry[]
	> = {
		experience: [],
		education: [],
		certifications: [],
		projects: [],
		volunteering: [],
	};
	const failedWorkers: ResumeOutlineItem[] = [];
	const usages: Array<LanguageModelUsage | undefined> = [outlineResult.usage];

	if (items.length === 0) {
		const emptyPhase = (toolName: string): ResumeParserPhaseTelemetry => ({
			status: "completed",
			toolName,
		});
		return {
			entries: entriesByKind,
			failedWorkers,
			outlineItemCount: 0,
			phases: {
				outline: {
					finishReason: outlineResult.finishReason,
					status: "completed",
					toolName: OUTLINE_EXTRACTOR_TOOL,
					usage: outlineResult.usage,
				},
				experience: emptyPhase(ENTRY_WORKER_TOOL),
				education: emptyPhase(ENTRY_WORKER_TOOL),
				certifications: emptyPhase(ENTRY_WORKER_TOOL),
				projects: emptyPhase(ENTRY_WORKER_TOOL),
				volunteering: emptyPhase(ENTRY_WORKER_TOOL),
			},
			reconcilerRetries: 0,
			usages,
		};
	}

	// Fan-out workers — each call sees the (cached) PDF + a narrow locator.
	const workerSettled = await Promise.allSettled(
		items.map((item) => extractEntryWorker(item, pdfData, signal, onEvent))
	);

	// First-pass results paired with their source item. Null when worker rejected.
	const firstPass: Array<WorkerResult | null> = workerSettled.map((settled) =>
		settled.status === "fulfilled" ? settled.value : null
	);

	// Reconciler: retry workers that returned an empty descriptor (likely missed
	// bullets) or failed outright. Cap retries to avoid runaway fan-out.
	const needsRetry = items
		.map((item, index) => ({ item, index }))
		.filter(({ index }) => {
			const result = firstPass[index];
			return !result || isEntryBodyEmpty(result.entry);
		});

	const retries = needsRetry.slice(0, MAX_RECONCILER_RETRIES);
	const retrySettled = await Promise.allSettled(
		retries.map(({ item }) => reconcileEntry(item, pdfData, signal, onEvent))
	);

	const reconciled = new Map<number, WorkerResult>(
		retrySettled
			.map((settled, retryIndex) => {
				const target = retries[retryIndex];
				if (!target || settled.status !== "fulfilled") {
					return null;
				}
				return [target.index, settled.value] as const;
			})
			.filter((entry): entry is readonly [number, WorkerResult] => entry !== null)
	);

	// Final assembly: prefer reconciler result when present, else first-pass, else log failure.
	items.forEach((item, index) => {
		const reconcileResult = reconciled.get(index);
		const passResult = firstPass[index];
		const winner = reconcileResult ?? passResult ?? null;

		if (!winner) {
			failedWorkers.push(item);
			logger.warn("resume-parser = worker_dropped", {
				kind: item.kind,
				title: item.title,
				subtitle: item.subtitle ?? null,
				dates: item.dateRangeRaw ?? null,
			});
			return;
		}

		const bucket = SECTION_KIND_BY_OUTLINE[item.kind];
		entriesByKind[bucket].push(winner.entry);
		if (winner.usage) {
			usages.push(winner.usage);
		}
		if (reconcileResult?.usage) {
			usages.push(reconcileResult.usage);
		}
	});

	const buildKindPhase = (bucket: keyof typeof entriesByKind): ResumeParserPhaseTelemetry => {
		const matched = items.filter((item) => SECTION_KIND_BY_OUTLINE[item.kind] === bucket);
		if (matched.length === 0) {
			return { status: "completed", toolName: ENTRY_WORKER_TOOL };
		}
		const successCount = entriesByKind[bucket].length;
		return {
			status: successCount === matched.length ? "completed" : "failed",
			toolName: ENTRY_WORKER_TOOL,
			reason:
				successCount === matched.length
					? undefined
					: `${matched.length - successCount}/${matched.length} entries failed extraction`,
		};
	};

	return {
		entries: entriesByKind,
		failedWorkers,
		outlineItemCount: items.length,
		phases: {
			outline: {
				finishReason: outlineResult.finishReason,
				status: "completed",
				toolName: OUTLINE_EXTRACTOR_TOOL,
				usage: outlineResult.usage,
			},
			experience: buildKindPhase("experience"),
			education: buildKindPhase("education"),
			certifications: buildKindPhase("certifications"),
			projects: buildKindPhase("projects"),
			volunteering: buildKindPhase("volunteering"),
		},
		reconcilerRetries: retries.length,
		usages,
	};
}

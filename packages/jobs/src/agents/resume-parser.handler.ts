/**
 * Resume parser agent.
 *
 * Phase 1: validate the PDF is a resume (gate — throws if not).
 * Phase 2: extract everything in 3 parallel bundled `generateText` calls:
 *          - header   (contact + summary)
 *          - entries  (experience, education, certifications, projects, volunteering)
 *          - skills   (skills, languages)
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
	extractedHeaderSchema,
	extractedSkillsBundleSchema,
	type ResumeParserPhase,
	type ResumeParserPhaseStatus,
	resumeValidationSchema,
} from "@stackk-career/schemas/jobs/resume-parser";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { generateText, type LanguageModel, Output } from "ai";
import { pdfUserMessage } from "../lib/ai/pdf-message";

// ─── Public surface ────────────────────────────────────────────────────────

export const RESUME_PARSER_MODEL: LanguageModel = "google/gemini-3.1-flash-lite";
export const RESUME_PARSER_OBJECT_TYPE = "resume-parser";

// Per-call timeouts. Cap stuck calls so siblings free their share of the task slot.
// Validation is a small bool+name output — fast. Bundles emit multi-section JSON — heavier output tokens.
const VALIDATION_TIMEOUT_MS = Number(process.env.RESUME_PARSER_VALIDATION_TIMEOUT_MS ?? 30 * 1000); // 30s
const BUNDLE_TIMEOUT_MS = Number(process.env.RESUME_PARSER_BUNDLE_TIMEOUT_MS ?? 4 * 60 * 1000); // 4 min

export interface ResumeParserEvent {
	kind: ResumeParserPhase | Exclude<SectionKind, "custom"> | "contact";
	reason?: string;
	status: ResumeParserPhaseStatus;
}

export interface RunResumeParserInput {
	onEvent?: (event: ResumeParserEvent) => void;
	pdfUrl: string;
	signal?: AbortSignal;
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
Extract the candidate's header info from the attached resume PDF. Return BOTH fields in one JSON object:

contact:
- firstName / lastName: split the full name. Empty string if missing.
- items: array of {kind, value, label?} where kind ∈ {address,email,phone,linkedin,website,other}.
- Do not invent data not present in the PDF.
- If no contact info found, return null.

summary:
- paragraphs: one or more paragraph blocks (text + format, default format "html").
- Wrap each paragraph's text in a single <p>...</p> when format is "html".
- If no summary / objective exists, return null (not an empty paragraphs array — null).
`.trim();

const ENTRIES_BUNDLE_SYSTEM = `
Extract every entries-based section from the attached resume PDF in ONE JSON object.

Sections to extract independently into their respective fields:
- experience: WORK EXPERIENCE (jobs, roles, internships).
- education: EDUCATION (degrees, schools, formal studies).
- certifications: CERTIFICATIONS.
- projects: PROJECTS.
- volunteering: VOLUNTEERING / community involvement.

Each section's value is { entries: [...] } or null if the section is not present in the PDF.

Each entry fields:
- title, subtitle, location (optional), isRemote (default false).
- startDate / endDate as YYYY-MM. isCurrent=true when the role is ongoing (then endDate is null).
- entryStyle="standard", descriptorFormat="html".
- descriptor: the entry's body as HTML. If the source has bullet points, emit them as a SINGLE <ul><li>...</li><li>...</li></ul> here — do NOT wrap individual bullets in <p>. Free-form prose paragraphs go in <p>...</p> tags BEFORE the list, in document order.

Allowed HTML tags only: p, ul, ol, li, strong, em, b, i, br.
Return null (not an empty entries array) for sections absent from the PDF.
`.trim();

const SKILLS_BUNDLE_SYSTEM = `
Extract every skills-based section from the attached resume PDF in ONE JSON object.

Sections:
- skills: technical / tools / frameworks. Use any of {technical, laboratory, interests, certifications, other} per line.category.
- languages: spoken languages. Every line.category MUST be "languages".

Each section's value is { lines: [...] } or null if the section is not present.

lines[]: each { label, category, items[] }. items[]: each { value, proficiency?, skillKind? }.
proficiency ∈ {basic, conversational, fluent, native, beginner, intermediate, advanced, expert}.

Return null (not an empty lines array) for sections absent from the PDF.
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
	timeoutMs: number
) => ({
	model: RESUME_PARSER_MODEL,
	abortSignal: withTimeout(signal, timeoutMs),
	system,
	messages: [pdfUserMessage(pdfUrl, userText)],
	providerOptions: {
		gateway: {
			tags: ["feature:resume-parser", `env:${process.env.NODE_ENV ?? "development"}`],
		},
	},
});

async function withEvents<T>(
	kind: ResumeParserEvent["kind"],
	onEvent: RunResumeParserInput["onEvent"],
	fn: () => Promise<T>
): Promise<T> {
	onEvent?.({ kind, status: "running" });
	try {
		const value = await fn();
		onEvent?.({ kind, status: "complete" });
		return value;
	} catch (err) {
		onEvent?.({ kind, status: "failed", reason: toError(err).message });
		throw err;
	}
}

const fulfilledOr = <T, F>(result: PromiseSettledResult<T>, fallback: F): T | F =>
	result.status === "fulfilled" ? result.value : fallback;

// ─── Main entry ────────────────────────────────────────────────────────────

export async function runResumeParserAgent({ pdfUrl, signal, onEvent }: RunResumeParserInput) {
	const validation = await withEvents("validation", onEvent, async () => {
		const { output } = await generateText({
			...baseRequest(
				pdfUrl,
				VALIDATE_SYSTEM,
				"Decide if the attached PDF is a resume / CV.",
				signal,
				VALIDATION_TIMEOUT_MS
			),
			output: Output.object({ schema: resumeValidationSchema }),
		});
		return output;
	});

	if (!validation.isResume) {
		throw new Error(`Not a resume: ${validation.reason}`);
	}

	const [headerResult, entriesResult, skillsResult] = await Promise.allSettled([
		withEvents("header", onEvent, async () => {
			const { output } = await generateText({
				...baseRequest(
					pdfUrl,
					HEADER_SYSTEM,
					"Extract the contact block and professional summary.",
					signal,
					BUNDLE_TIMEOUT_MS
				),
				output: Output.object({ schema: extractedHeaderSchema }),
			});
			return output;
		}),
		withEvents("entries", onEvent, async () => {
			const { output } = await generateText({
				...baseRequest(
					pdfUrl,
					ENTRIES_BUNDLE_SYSTEM,
					"Extract every entries-based section.",
					signal,
					BUNDLE_TIMEOUT_MS
				),
				output: Output.object({ schema: extractedEntriesBundleSchema }),
			});
			return output;
		}),
		withEvents("skills", onEvent, async () => {
			const { output } = await generateText({
				...baseRequest(pdfUrl, SKILLS_BUNDLE_SYSTEM, "Extract every skills-based section.", signal, BUNDLE_TIMEOUT_MS),
				output: Output.object({ schema: extractedSkillsBundleSchema }),
			});
			return output;
		}),
	]);

	const header = fulfilledOr(headerResult, { contact: null, summary: null });
	const entries = fulfilledOr(entriesResult, {
		experience: null,
		education: null,
		certifications: null,
		projects: null,
		volunteering: null,
	});
	const skills = fulfilledOr(skillsResult, { skills: null, languages: null });

	return {
		validation,
		contact: header.contact,
		summary: header.summary,
		experience: entries.experience,
		education: entries.education,
		certifications: entries.certifications,
		projects: entries.projects,
		volunteering: entries.volunteering,
		skills: skills.skills,
		languages: skills.languages,
	};
}

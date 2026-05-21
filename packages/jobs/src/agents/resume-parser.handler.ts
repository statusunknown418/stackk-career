/**
 * Resume parser agent.
 *
 * Phase 1: validate the PDF is a resume (gate — throws if not).
 * Phase 2: extract every section in parallel via independent generateText calls
 *          with Output.object schemas. Emits a progress event around each call
 *          via the optional onEvent callback (task layer pipes them to Trigger
 *          metadata).
 *
 * Per-section types flow from the concrete schema at the call site — no `as`
 * casts. Failed sections fall back to null and never block siblings.
 */

import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import { contactContentSchema } from "@stackk-career/schemas/db/resume-blocks";
import {
	extractedEntriesSectionSchema,
	extractedSkillsSectionSchema,
	extractedSummarySchema,
	resumeValidationSchema,
} from "@stackk-career/schemas/jobs/resume-parser";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { generateText, Output } from "ai";
import { pdfUserMessage } from "../lib/ai/pdf-message";

// ─── Public surface ────────────────────────────────────────────────────────

export const RESUME_PARSER_MODEL = "google/gemini-3.1-flash";
export const RESUME_PARSER_OBJECT_TYPE = "resume-parser";

// "custom" is editor-only — agent never produces it. "contact" is its own top-level block
// (not part of SECTION_KINDS). "validation" is the gate phase.
type ExtractableKind = "validation" | "contact" | Exclude<SectionKind, "custom">;

export interface ResumeParserEvent {
	kind: ExtractableKind;
	reason?: string;
	status: "running" | "complete" | "failed";
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

const CONTACT_SYSTEM = `
Extract the candidate's contact block from the attached resume PDF.
- firstName / lastName: split the full name. Empty string if missing.
- items: array of {kind, value, label?} where kind ∈ {address,email,phone,linkedin,website,other}.
- Do not invent data not present in the PDF.
`.trim();

const SUMMARY_SYSTEM = `
Extract the professional summary / objective paragraph from the attached resume PDF.
- paragraphs: one or more paragraph blocks (text + format, default format "html").
- Wrap each paragraph's text in a single <p>...</p> when format is "html".
- If no summary exists, return paragraphs: [].
`.trim();

const ENTRIES_SYSTEM = `
Extract every entry from the requested section of the attached resume PDF.

Each entry fields:
- title, subtitle, location (optional), isRemote (default false).
- startDate / endDate as YYYY-MM. isCurrent=true when the role is ongoing (then endDate is null).
- entryStyle="standard", descriptorFormat="html".
- descriptor: the entry's body as HTML. If the source has bullet points, emit them as a SINGLE <ul><li>...</li><li>...</li></ul> here — do NOT wrap individual bullets in <p>. Free-form prose paragraphs go in <p>...</p> tags BEFORE the list, in document order.

Allowed HTML tags only: p, ul, ol, li, strong, em, b, i, br.
If the section is not present, return entries: [].
`.trim();

const SKILLS_SYSTEM = `
Extract every skill grouping from the requested section of the attached resume PDF.
- lines[]: each {label, category, items[]}. category ∈ {technical, languages, laboratory, interests, certifications, other}.
- items[]: each {value, proficiency?, skillKind?}. proficiency ∈ {basic, conversational, fluent, native, beginner, intermediate, advanced, expert}.
- If section not present, return lines: [].
`.trim();

// ─── Internal helpers ──────────────────────────────────────────────────────

/** Common `generateText` arguments shared by every extraction call. */
const baseRequest = (pdfUrl: string, system: string, userText: string, signal: AbortSignal | undefined) => ({
	model: RESUME_PARSER_MODEL,
	abortSignal: signal,
	system,
	messages: [pdfUserMessage(pdfUrl, userText)],
});

/** Wrap an async extraction so it emits running/complete/failed events. Generic in T → type flows from inner generateText through to caller. */
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

const fulfilledOrNull = <T>(result: PromiseSettledResult<T>): T | null =>
	result.status === "fulfilled" ? result.value : null;

// ─── Main entry ────────────────────────────────────────────────────────────

export async function runResumeParserAgent({ pdfUrl, signal, onEvent }: RunResumeParserInput) {
	const validation = await withEvents("validation", onEvent, async () => {
		const { output } = await generateText({
			...baseRequest(pdfUrl, VALIDATE_SYSTEM, "Decide if the attached PDF is a resume / CV.", signal),
			output: Output.object({ schema: resumeValidationSchema }),
		});
		return output;
	});

	if (!validation.isResume) {
		throw new Error(`Not a resume: ${validation.reason}`);
	}

	const [contact, summary, experience, education, skills, languages, certifications, projects, volunteering] =
		await Promise.allSettled([
			withEvents("contact", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(pdfUrl, CONTACT_SYSTEM, "Extract the contact block.", signal),
					output: Output.object({ schema: contactContentSchema }),
				});
				return output;
			}),
			withEvents("summary", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(pdfUrl, SUMMARY_SYSTEM, "Extract the professional summary.", signal),
					output: Output.object({ schema: extractedSummarySchema }),
				});

				return output;
			}),
			withEvents("experience", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(
						pdfUrl,
						ENTRIES_SYSTEM,
						"Extract the WORK EXPERIENCE section (jobs, roles, internships).",
						signal
					),
					output: Output.object({ schema: extractedEntriesSectionSchema }),
				});

				return output;
			}),
			withEvents("education", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(
						pdfUrl,
						ENTRIES_SYSTEM,
						"Extract the EDUCATION section (degrees, schools, formal studies).",
						signal
					),
					output: Output.object({ schema: extractedEntriesSectionSchema }),
				});

				return output;
			}),
			withEvents("skills", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(pdfUrl, SKILLS_SYSTEM, "Extract the SKILLS section (technical, tools, frameworks).", signal),
					output: Output.object({ schema: extractedSkillsSectionSchema }),
				});

				return output;
			}),
			withEvents("languages", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(
						pdfUrl,
						SKILLS_SYSTEM,
						'Extract the LANGUAGES section. Use category "languages" for every line.',
						signal
					),
					output: Output.object({ schema: extractedSkillsSectionSchema }),
				});

				return output;
			}),
			withEvents("certifications", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(pdfUrl, ENTRIES_SYSTEM, "Extract the CERTIFICATIONS section.", signal),
					output: Output.object({ schema: extractedEntriesSectionSchema }),
				});

				return output;
			}),
			withEvents("projects", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(pdfUrl, ENTRIES_SYSTEM, "Extract the PROJECTS section.", signal),
					output: Output.object({ schema: extractedEntriesSectionSchema }),
				});

				return output;
			}),
			withEvents("volunteering", onEvent, async () => {
				const { output } = await generateText({
					...baseRequest(pdfUrl, ENTRIES_SYSTEM, "Extract the VOLUNTEERING / community involvement section.", signal),
					output: Output.object({ schema: extractedEntriesSectionSchema }),
				});

				return output;
			}),
		]);

	return {
		validation,
		contact: fulfilledOrNull(contact),
		summary: fulfilledOrNull(summary),
		experience: fulfilledOrNull(experience),
		education: fulfilledOrNull(education),
		skills: fulfilledOrNull(skills),
		languages: fulfilledOrNull(languages),
		certifications: fulfilledOrNull(certifications),
		projects: fulfilledOrNull(projects),
		volunteering: fulfilledOrNull(volunteering),
	};
}

import { resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import { type LanguageModel, Output, streamText } from "ai";
import { pdfUserMessage } from "../lib/ai/pdf-message";
import { getUserMetadata, withTimeout } from "../lib/user-metadata";

export const K02_FAST_ANALYSIS_MODEL: LanguageModel = "google/gemini-3.1-flash-lite";
export const K02_FAST_ANALYSIS_OBJECT_TYPE = "resume-analysis-fast";

const K02_TIMEOUT_MS = Number(process.env.K02_FAST_ANALYSIS_TIMEOUT_MS ?? 3 * 60 * 1000); // 3 min

export interface RunK02FastAnalysisInput {
	pdfUrl: string;
	signal?: AbortSignal;
	userId: string;
}

const SYSTEM_PROMPT = `
You are an expert resume analyst. Analyze the attached PDF resume and return structured JSON conforming to the provided schema.

# Guardrails:
- You should REJECT any file that doesn't look like a resume, anything other than resumes will NOT be processed by you
- DO NOT attempt to analyze files that do not have a resume-like structure

Hard rules:
- Ground every score and suggestion strictly in the PDF content. Do not invent experience, skills, or facts.
- Score each dimension from 0 to 100 (impact, keywords, clarity, formatting, length). Every score MUST be an INTEGER (no decimals). Set scoreOverall as the weighted overall (impact 30%, keywords 25%, clarity 20%, formatting 15%, length 10%) AND ROUND TO THE NEAREST INTEGER. Never output a fractional score like 84.5 — emit 85.
- Return AT MOST 5 edits, ranked by delta descending. Each delta represents the score points the edit would add (1-20).
- DELTA BUDGET (HARD RULE): For each category, the sum of deltas of edits in that category PLUS the current scoreBreakdown[category] MUST NOT exceed 100. If a sub-score is already 100, propose zero edits in that category.
- For every edit:
  - category: which sub-score the edit raises.
  - severity: "top-win" (a clear quantifiable improvement), "missing" (an item absent vs expected), or "soft-signal" (minor polish).
  - title: short imperative phrase.
  - description: 1-2 short sentences with a concrete before/after grounded in the PDF.
- No generic advice. No filler. No hedging.

# Scoring rubric (HARD CAPS — apply BEFORE picking any number):
A resume is only "good" if it has real, complete, well-written content. Penalize aggressively for missing or broken content. Apply these caps strictly; the final sub-score is the MINIMUM of (your judgment, all caps that trigger).

## Universal content-quality gates (apply to every sub-score):
- If the resume has fewer than 2 distinct experience entries with bullets → all sub-scores capped at 40.
- If ANY experience entry has no bullet points / no description → impact ≤ 35, clarity ≤ 45, length ≤ 40.
- If ANY entry is missing dates (start or end) → formatting ≤ 35, clarity ≤ 45.
- If duplicate entries exist (same title + company appearing more than once) → formatting ≤ 25, clarity ≤ 30, impact ≤ 35. This is a severe structural defect.
- If any text field contains meta-commentary, placeholder text, parser artifacts, "Note:", "Omitted due to", or any other non-resume content → clarity ≤ 20, formatting ≤ 20, impact ≤ 25.
- If the resume has no measurable achievements (no numbers, percentages, dollar amounts, scale indicators) anywhere → impact ≤ 45.
- If the resume has no contact section or contact section is empty → formatting ≤ 30.
- If total resume content (excluding the contact section) is under ~200 words → length ≤ 30, impact ≤ 40.

## Per-dimension anchors (use the LOWER bound that fits):
- impact: 0–30 = no metrics, vague verbs, duties not outcomes. 31–55 = some metrics, mostly duties. 56–75 = consistent metrics, strong verbs, clear outcomes. 76–90 = quantified achievements throughout, scope/scale visible. 91–100 = exceptional, every bullet is an outcome with magnitude.
- keywords: 0–30 = no role-relevant skills/tech listed. 31–55 = generic skills, missing core stack for the implied target role. 56–75 = relevant skills present, mostly aligned with experience. 76–90 = strong alignment between skills and bullets, modern stack. 91–100 = comprehensive, ATS-optimized for a specific role.
- clarity: 0–30 = sentences broken, meta-commentary present, unreadable. 31–55 = vague, passive voice, hard to scan. 56–75 = readable, active voice, mostly tight. 76–90 = crisp, scannable, every bullet purposeful. 91–100 = publication-quality writing.
- formatting: 0–30 = duplicates, missing dates, corrupted fields, broken structure. 31–55 = inconsistent dates/locations/order. 56–75 = consistent structure, minor inconsistencies. 76–90 = clean, consistent, easy to skim. 91–100 = polished, professional-grade structure.
- length: 0–30 = nearly empty (no bullets / under ~150 words). 31–55 = thin (1–2 bullets per role, < 300 words total). 56–75 = adequate (3–5 bullets per role, 350–700 words). 76–90 = well-balanced. 91–100 = ideal density for seniority level.

Picking a score: start from the dimension anchor, then apply EVERY universal cap that triggers, then take the minimum. Do not round upward to be generous.

Output:
- Output ONLY the JSON object conforming to the provided schema. No prose, no markdown fences, no explanation.

Language:
- Respond in SPANISH for every "title" and "description" string. Keep enum values (category, severity) in English exactly as defined.
`.trim();

export async function runK02FastAnalysisAgent({ pdfUrl, userId, signal }: RunK02FastAnalysisInput) {
	const metadata = await getUserMetadata(userId);

	const userContextText = metadata
		? `User context (use to tailor suggestions, do not invent facts beyond the resume):\n${JSON.stringify(metadata, null, 2)}`
		: "User context: not available. Base every suggestion strictly on the PDF.";

	return streamText({
		model: K02_FAST_ANALYSIS_MODEL,
		output: Output.object({ schema: resumeAnalysisSchema }),
		abortSignal: withTimeout(signal, K02_TIMEOUT_MS),
		system: SYSTEM_PROMPT,
		messages: [
			pdfUserMessage(pdfUrl, userContextText, "Analyze the attached resume PDF and return structured suggestions."),
		],
		providerOptions: {
			gateway: {
				user: userId,
				tags: ["feature:k02-fast-analysis", `env:${process.env.NODE_ENV ?? "development"}`],
			},
		},
	});
}

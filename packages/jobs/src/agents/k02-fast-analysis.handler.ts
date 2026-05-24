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
- Score each dimension from 0 to 100 (impact, keywords, clarity, formatting, length). Set scoreOverall as the weighted overall (impact 30%, keywords 25%, clarity 20%, formatting 15%, length 10%).
- Return AT MOST 5 edits, ranked by delta descending. Each delta represents the score points the edit would add (1-20). THE TOTAL SUM + DELTAS SHOULD NOT SURPASS 100
- For every edit:
  - category: which sub-score the edit raises.
  - severity: "top-win" (a clear quantifiable improvement), "missing" (an item absent vs expected), or "soft-signal" (minor polish).
  - title: short imperative phrase.
  - description: 1-2 short sentences with a concrete before/after grounded in the PDF.
- No generic advice. No filler. No hedging.

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

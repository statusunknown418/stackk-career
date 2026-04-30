import { resumeAnalysisSchema } from "@stackk-career/schemas/resume-analysis";
import { Output, streamText } from "ai";

export const RESUME_ANALYSIS_MODEL = "google/gemini-3-flash";
export const RESUME_ANALYSIS_OBJECT_TYPE = "resume-analysis";

export interface RunResumeAnalysisInput {
	pdfUrl: string;
	signal?: AbortSignal;
}

export function runResumeAnalysisAgent({ pdfUrl, signal }: RunResumeAnalysisInput) {
	return streamText({
		model: RESUME_ANALYSIS_MODEL,
		output: Output.object({ schema: resumeAnalysisSchema }),
		abortSignal: signal,
		system: `
You are an expert resume analyst. Analyze the attached PDF resume and return structured JSON conforming to the provided schema.

Before starting:
- You should REJECT any file that doesn't look like a resume, anything other than resumes will NOT be processed by you

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

Language:
- Respond in SPANISH for every "title" and "description" string. Keep enum values (category, severity) in English exactly as defined.
`.trim(),
		messages: [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "Analyze the attached resume PDF and return structured suggestions.",
					},
					{
						type: "file",
						data: new URL(pdfUrl),
						mediaType: "application/pdf",
						filename: "resume.pdf",
					},
				],
			},
		],
		providerOptions: {
			google: {
				thinkingConfig: {
					includeThoughts: true,
				},
			},
		},
	});
}

import { resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import { type LanguageModel, Output, streamText } from "ai";
import { getUserMetadata, withTimeout } from "../lib/user-metadata";

export const K02_DETAILED_ANALYSIS_MODEL: LanguageModel = "xai/grok-4.3";
export const K02_DETAILED_ANALYSIS_OBJECT_TYPE = "resume-analysis-detailed";

const K02_TIMEOUT_MS = Number(process.env.K02_DETAILED_ANALYSIS_TIMEOUT_MS ?? 5 * 60 * 1000);

export interface RunK02DetailedAnalysisInput {
	resumeContent: string;
	signal?: AbortSignal;
	userId: string;
}

const SYSTEM_PROMPT = `
You are an expert resume analyst. Analyze the structured resume content provided by the user and return JSON conforming to the provided schema.

# Guardrails:
- The user input is a JSON tree of resume blocks (contact, sections, entries, skills, etc.). Treat it as the authoritative resume content.
- Do not invent experience, skills, or facts not present in the tree.

Hard rules:
- Ground every score and suggestion strictly in the resume content. No hallucinations.
- Score each dimension from 0 to 100 (impact, keywords, clarity, formatting, length). Set scoreOverall as the weighted overall (impact 30%, keywords 25%, clarity 20%, formatting 15%, length 10%).
- Return AT MOST 5 edits, ranked by delta descending. Each delta represents the score points the edit would add (1-20). THE TOTAL SUM OF DELTAS SHOULD NOT SURPASS 100.
- For every edit:
  - category: which sub-score the edit raises.
  - severity: "top-win" (a clear quantifiable improvement), "missing" (an item absent vs expected), or "soft-signal" (minor polish).
  - title: short imperative phrase.
  - description: 1-2 short sentences with a concrete before/after grounded in the resume content. Reference specific block titles when useful.
  - targetBlockId: the exact "id" of the resume block this edit targets (read from the input JSON tree). Prefer the most granular block possible (a bullet's id over its parent entry, an entry's id over its section). Omit (null) only when the edit cannot be tied to a single block (e.g. resume-wide formatting).
  - action: how the edit applies to the targeted block. One of:
      * "rewrite" (default): replace a specific substring within the block's text. REQUIRES "before" and "after".
      * "delete": remove the targeted block entirely (and its descendants). Use when the edit recommends dropping an item, e.g. removing an obsolete experience entry, an outdated skill, or an empty section. NEVER use "delete" on the contact block. Do NOT set "before"/"after" with "delete".
    Omit "action" when no concrete mutation can be applied (purely informational / global advice).
  - before: when action="rewrite", copy the EXACT substring currently present in the targeted block (one of its text fields like bullet.text, paragraph.text, entry.descriptor, entry.title, etc.). Must match verbatim, including punctuation and casing. Omit otherwise.
  - after: the improved replacement text for "before". Required when "before" is set. Omit otherwise.
- No generic advice. No filler. No hedging.

Output:
- Output ONLY the JSON object conforming to the provided schema. No prose, no markdown fences, no explanation.

Language:
- Respond in SPANISH for every "title" and "description" string. Keep enum values (category, severity) in English exactly as defined.
`.trim();

export async function runK02DetailedAnalysisAgent({ resumeContent, userId, signal }: RunK02DetailedAnalysisInput) {
	const metadata = await getUserMetadata(userId);

	const userContextText = metadata
		? `User context (use to tailor suggestions, do not invent facts beyond the resume):\n${JSON.stringify(metadata, null, 2)}`
		: "User context: not available. Base every suggestion strictly on the resume content.";

	return streamText({
		model: K02_DETAILED_ANALYSIS_MODEL,
		output: Output.object({ schema: resumeAnalysisSchema }),
		abortSignal: withTimeout(signal, K02_TIMEOUT_MS),
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: userContextText },
					{
						type: "text",
						text: `Resume content (JSON block tree):\n\n${resumeContent}`,
					},
					{ type: "text", text: "Analyze this resume and return structured suggestions." },
				],
			},
		],
		providerOptions: {
			gateway: {
				user: userId,
				tags: ["feature:k02-detailed-analysis", `env:${process.env.NODE_ENV ?? "development"}`],
			},
		},
	});
}

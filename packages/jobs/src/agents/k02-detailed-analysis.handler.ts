import { type PriorAnalysisContext, resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import { type LanguageModel, Output, streamText } from "ai";
import { getUserMetadata, withTimeout } from "../lib/user-metadata";

export const K02_DETAILED_ANALYSIS_MODEL: LanguageModel = "google/gemini-2.5-flash";
export const K02_DETAILED_ANALYSIS_OBJECT_TYPE = "resume-analysis-detailed";

const K02_TIMEOUT_MS = Number(process.env.K02_DETAILED_ANALYSIS_TIMEOUT_MS ?? 5 * 60 * 1000);

export interface RunK02DetailedAnalysisInput {
	priorAnalysis?: PriorAnalysisContext;
	resumeContent: string;
	signal?: AbortSignal;
	userId: string;
}

const SYSTEM_PROMPT = `
You are an expert resume analyst. Analyze the structured resume content provided by the user and return JSON conforming to the provided schema.

# Guardrails:
- The user input is a JSON tree of resume blocks (contact, sections, entries, skills, etc.). Treat it as the authoritative resume content.
- Do not invent experience, skills, or facts not present in the tree.

# Hard rules:
- Ground every score and suggestion strictly in the resume content. No hallucinations.
- Score each dimension from 0 to 100 (impact, keywords, clarity, formatting, length). Every score MUST be an INTEGER (no decimals). Set scoreOverall as the weighted overall (impact 30%, keywords 25%, clarity 20%, formatting 15%, length 10%) AND ROUND TO THE NEAREST INTEGER. Never output a fractional score like 84.5 — emit 85.
- Return AT MOST 5 edits, ranked by delta descending. Each delta represents the score points the edit would add (1-20).
- DELTA BUDGET (HARD RULE): For each category, the sum of deltas of edits in that category PLUS the current scoreBreakdown[category] MUST NOT exceed 100. Example: if scoreBreakdown.impact = 85, you may propose at most 15 total impact-points across all "impact" edits. If a sub-score is already 100, propose zero edits in that category. Skip edits that would breach this budget — do not invent improvements the resume cannot mathematically absorb.
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

# Output:
- Output ONLY the JSON object conforming to the provided schema. No prose, no markdown fences, no explanation.

# Language:
- Respond in SPANISH for every "title" and "description" string. Keep enum values (category, severity) in English exactly as defined.

# Re-analysis (when prior analysis context is provided):
- Treat the prior analysis as ground truth for what was previously suggested.
- An edit marked status="applied" was applied by the user. Assume its "after" text is already present in the resume content. DO NOT propose the same edit again. If you still see the "before" text, it means the user reverted it — only then may you resurface that edit.
- An edit marked status="dismissed" was explicitly rejected by the user. NEVER propose the same idea again, even with different wording. Treat the underlying concern as resolved.
- An edit marked status="pending" was shown but not acted on. You MAY propose it again only if it remains the highest-leverage improvement. Prefer fresh ideas the user has not seen.
- Score calibration (HARD RULE):
  - For each "applied" edit, the matching sub-score (edit.category) MUST increase by AT LEAST the edit's "delta" relative to the prior analysis. Sum deltas within the same category. Cap each sub-score at 100.
  - Example: prior scoreBreakdown.impact=60 and two applied edits with category="impact" and delta=8, delta=5 → new scoreBreakdown.impact >= 73.
  - You MAY increase sub-scores further only if you can point to concrete improvements in the current resume content beyond the applied edits.
  - "dismissed" and "pending" edits MUST NOT raise scores (the improvement they promised has not happened).
  - Recompute scoreOverall from the new scoreBreakdown using the weights (impact 30%, keywords 25%, clarity 20%, formatting 15%, length 10%) AND ROUND TO THE NEAREST INTEGER. Do not invent overall scores. Never emit a fractional score.
  - Sub-scores may decrease only if you identify new regressions in the resume content. Justify any decrease implicitly through a new edit targeting it.
- Output ONLY genuinely new, actionable edits. If the resume is now strong and no high-quality edits remain, return fewer than 5 edits (the array may be empty).
`.trim();

export async function runK02DetailedAnalysisAgent({
	resumeContent,
	userId,
	signal,
	priorAnalysis,
}: RunK02DetailedAnalysisInput) {
	const metadata = await getUserMetadata(userId);

	const userContextText = metadata
		? `User context (use to tailor suggestions, do not invent facts beyond the resume):\n${JSON.stringify(metadata, null, 2)}`
		: "User context: not available. Base every suggestion strictly on the resume content.";

	const priorAnalysisText = priorAnalysis
		? `Prior analysis (apply the re-analysis rules):\n\n${JSON.stringify(priorAnalysis, null, 2)}`
		: null;

	const instruction = priorAnalysis
		? "Re-analyze this resume given the prior analysis above. Return ONLY new, non-redundant suggestions and recalibrated scores."
		: "Analyze this resume and return structured suggestions.";

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
					...(priorAnalysisText ? [{ type: "text" as const, text: priorAnalysisText }] : []),
					{
						type: "text",
						text: `Resume content (JSON block tree):\n\n${resumeContent}`,
					},
					{ type: "text", text: instruction },
				],
			},
		],
		providerOptions: {
			gateway: {
				user: userId,
				tags: ["feature:k02-detailed-analysis", `env:${process.env.NODE_ENV ?? "development"}`],
			},
			google: {
				thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
			},
		},
	});
}

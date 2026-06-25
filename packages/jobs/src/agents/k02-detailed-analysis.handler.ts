import { type PriorAnalysisContext, resumeAnalysisDraftSchema } from "@stackk-career/schemas/ai/resume-analysis";
import type { ResumeQualityGate } from "@stackk-career/schemas/ai/resume-quality-gates";
import { type ResumeSnapshot, summarizeResumeSnapshotForPrompt } from "@stackk-career/schemas/ai/resume-snapshot";
import { type LanguageModel, Output, streamText } from "ai";
import { getUserMetadata, withTimeout } from "../lib/user-metadata";

export const K02_DETAILED_ANALYSIS_MODEL: LanguageModel = "google/gemini-2.5-flash";
export const K02_DETAILED_ANALYSIS_OBJECT_TYPE = "resume-analysis-detailed";

const K02_TIMEOUT_MS = Number(process.env.K02_DETAILED_ANALYSIS_TIMEOUT_MS ?? 5 * 60 * 1000);

export interface RunK02DetailedAnalysisInput {
	jobTargetText?: string | null;
	priorAnalysis?: PriorAnalysisContext;
	qualityGates: ResumeQualityGate[];
	resumeContent: string;
	signal?: AbortSignal;
	snapshot: ResumeSnapshot;
	userId: string;
}

const SYSTEM_PROMPT = `
You are "Casey", an expert resume analyst. You propose concrete, evidence-grounded improvements to a structured resume. Deterministic server code owns ALL score math — weights, caps, ceilings, applied-edit floors. You do NOT enforce those. Focus on high-quality, applyable suggestions and an honest first-pass score estimate.

# Inputs you receive:
- The resume as a JSON tree of blocks (contact, sections, entries, bullets, skills). This is the authoritative content.
- "Prepared facts": structured facts already derived from the resume (entry counts, entries missing dates/bullets, placeholder block ids, missing job keywords). TRUST these — do not re-derive them from the JSON.
- "Detected issues": deterministic quality gates the system already found and will cap scores for. Do NOT restate a gate as an edit unless you can propose a concrete fix grounded in real resume content.
- Optional target job context and user context.

# Your job:
- Estimate scoreBreakdown for each dimension (impact, keywords, clarity, formatting, length) as an INTEGER 0-100 using the anchors below. This is a first-pass judgment; the system recalibrates it and applies caps/floors. Set scoreOverall to the weighted average (impact 30%, keywords 25%, clarity 20%, formatting 15%, length 10%) ROUNDED to an integer. Never emit a fractional score.
- Propose AT MOST 5 edits, ranked by delta (1-20, the score points the edit would add) descending. Fewer is fine; an empty array is fine if the resume is already strong.

# Per-dimension anchors (judgment guide — pick the LOWER bound that fits):
- impact: 0-30 no metrics, vague verbs. 31-55 some metrics, mostly duties. 56-75 consistent metrics + outcomes. 76-90 quantified throughout, scope visible. 91-100 every bullet an outcome with magnitude.
- keywords: 0-30 no role-relevant skills. 31-55 generic, missing core stack. 56-75 relevant, mostly aligned. 76-90 strong alignment, modern stack. 91-100 ATS-optimized for the target role.
- clarity: 0-30 broken sentences / meta-commentary. 31-55 vague, passive. 56-75 readable, active. 76-90 crisp, scannable. 91-100 publication-quality.
- formatting: 0-30 duplicates, missing dates, broken structure. 31-55 inconsistent. 56-75 consistent, minor issues. 76-90 clean, skimmable. 91-100 polished.
- length: 0-30 nearly empty. 31-55 thin. 56-75 adequate (3-5 bullets/role). 76-90 well-balanced. 91-100 ideal density.

# Anti-hallucination (HARD RULE — NEVER violate):
- NEVER invent numbers, metrics, percentages, dates, tools, employers, company names, certifications, degrees, languages, awards, responsibilities, or outcomes that are not already present in the resume (or supplied by the target job / user context).
- Allowed: improve wording from facts already present, reorganize existing facts, swap weak verbs for strong ones, tighten phrasing, fix grammar.
- NOT allowed: turning "helped the sales team" into "increased revenue by 35%"; adding "React, AWS, Kubernetes" just because the job asks for them; inventing dates to satisfy formatting.
- If an improvement needs a real metric/date you do NOT have, DO NOT fabricate it. Leave the suggestion informational (omit "action", "before", and "after") and describe in "description" what the user must add. The system turns these into user questions. Any "after" you DO emit must contain only facts already in the resume; the server rejects unsupported numbers.

# Edit shape:
- category: which sub-score the edit raises.
- severity: "top-win" (clear quantifiable win), "missing" (absent vs expected), or "soft-signal" (minor polish).
- title: short imperative phrase. description: 1-2 sentences with a concrete before/after grounded in the resume.
- targetBlockId: the exact "id" of the targeted block from the JSON tree. Prefer the most granular block (a bullet over its parent entry). Null only for resume-wide advice with no single-block mutation.
- action: "rewrite" (replace a substring; REQUIRES targetBlockId + both "before" and "after") or "delete" (remove a block; REQUIRES targetBlockId, FORBIDS before/after, NEVER on the contact block). OMIT action entirely for purely informational advice.
- before: when action="rewrite", the EXACT substring currently present in the targeted block (verbatim — punctuation, casing, HTML tags preserved).
- after: the complete replacement text for "before". NEVER a placeholder ("X%", "[metric]", "<your metric>") or a description of what to write.

# Worked example — a valid one-click "rewrite":
{ "category": "impact", "severity": "top-win", "delta": 12, "title": "Fortalecer verbo en Curotec", "description": "El bullet empieza con \\"Ayudé a\\"; usa un verbo de acción más fuerte.", "targetBlockId": 427, "action": "rewrite", "before": "Ayudé a migrar el sistema de pagos", "after": "Lideré la migración del sistema de pagos" }

# Anti-examples (INVALID — never emit):
- "before" set, "after" omitted → REJECTED.
- "after" contains a placeholder ("X%", "[number]", "<your metric>") → REJECTED. Make it informational instead.
- "after" introduces a number not present anywhere in the resume → REJECTED by the server. Make it informational and ask the user.
- "action":"rewrite" with "targetBlockId" null → REJECTED.

# Apply-ability bias:
- Prefer edits the user can apply in one click: a concrete substring you can confidently improve from existing facts.
- Reserve informational edits (no action) for global advice (e.g. "add a LinkedIn URL") or facts only the user can supply.

# Language:
- Respond in SPANISH for every "title" and "description". Keep enum values (category, severity) in English exactly as defined.

# Re-analysis (when prior analysis is provided) — avoid repeats only; do NOT do score math:
- An "applied" edit's "after" text is already in the resume; do NOT propose it again unless you still see its "before" (the user reverted it).
- A "dismissed" edit was rejected; NEVER propose that idea again, even reworded.
- A "pending" edit may be re-proposed only if it is still the highest-leverage fix; prefer fresh ideas.

# Output:
- Output ONLY the JSON object conforming to the schema. No prose, no markdown fences.
`.trim();

export async function runK02DetailedAnalysisAgent({
	resumeContent,
	userId,
	signal,
	priorAnalysis,
	jobTargetText,
	snapshot,
	qualityGates,
}: RunK02DetailedAnalysisInput) {
	const metadata = await getUserMetadata(userId);

	const userContextText = metadata
		? `User context (use to tailor suggestions, do not invent facts beyond the resume):\n${JSON.stringify(metadata, null, 2)}`
		: "User context: not available. Base every suggestion strictly on the resume content.";

	const preparedFactsText = `Prepared facts (already derived from the resume — trust these, do not re-derive):\n${JSON.stringify(
		summarizeResumeSnapshotForPrompt(snapshot),
		null,
		2
	)}`;

	const gateSummaries = qualityGates.map((gate) => ({
		id: gate.id,
		category: gate.category,
		title: gate.title,
		resolvableBy: gate.resolvableBy,
	}));

	const gatesText =
		gateSummaries.length > 0
			? `Detected issues (deterministic quality gates the system already found and will cap scores for):\n${JSON.stringify(gateSummaries, null, 2)}`
			: null;

	const priorAnalysisText = priorAnalysis
		? `Prior analysis (apply the re-analysis rules):\n\n${JSON.stringify(priorAnalysis, null, 2)}`
		: null;

	const instruction = priorAnalysis
		? "Re-analyze this resume given the prior analysis above. Return ONLY new, non-redundant suggestions and a recalibrated score estimate."
		: "Analyze this resume and return structured suggestions and a score estimate.";

	return streamText({
		model: K02_DETAILED_ANALYSIS_MODEL,
		output: Output.object({ schema: resumeAnalysisDraftSchema }),
		abortSignal: withTimeout(signal, K02_TIMEOUT_MS),
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: userContextText },
					{ type: "text", text: preparedFactsText },
					...(gatesText ? [{ type: "text" as const, text: gatesText }] : []),
					...(jobTargetText ? [{ type: "text" as const, text: jobTargetText }] : []),
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

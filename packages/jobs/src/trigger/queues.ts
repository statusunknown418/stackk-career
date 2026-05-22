import { queue } from "@trigger.dev/sdk";

/**
 * Resume parser fans out 4 LLM calls per run (validation + header + entries bundle + skills bundle).
 * Keep concurrency conservative — each slot can hold up to ~4 in-flight gateway calls.
 */
export const resumeParserQueue = queue({
	name: "resume-parser",
	concurrencyLimit: Number(process.env.RESUME_PARSER_QUEUE_CONCURRENCY ?? 5),
});

/**
 * k02 streams a single LLM call. Cheap per slot — can run wider.
 */
export const k02Queue = queue({
	name: "k02-fast-analysis",
	concurrencyLimit: Number(process.env.K02_QUEUE_CONCURRENCY ?? 10),
});

import { queue } from "@trigger.dev/sdk";
import { envNumber } from "../lib/env-number";

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

/**
 * k02 detailed analysis runs over the persisted resume block tree.
 * Larger context window per call, so keep concurrency tighter than fast.
 */
export const k02DetailedQueue = queue({
	name: "k02-detailed-analysis",
	concurrencyLimit: Number(process.env.K02_DETAILED_QUEUE_CONCURRENCY ?? 5),
});

/**
 * casey-letters generates a single CoverLetter via streamText. 1 LLM call per run,
 * cheap per slot — can run wider, similar to k02Queue.
 */
export const letterQueue = queue({
	name: "casey-letters",
	concurrencyLimit: envNumber(process.env.LETTER_QUEUE_CONCURRENCY, 10),
});

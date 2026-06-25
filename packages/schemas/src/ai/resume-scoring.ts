import type { EditCategory, ResumeAnalysisScoreBreakdown } from "./resume-analysis-enums";

/**
 * Identifier for the deterministic scoring rubric. Bump when weights, caps, or
 * normalization semantics change so old persisted analyses can be detected and
 * invalidated. `100` means rubric-perfect for the current target job context.
 */
export const RUBRIC_VERSION = "2026-06-24" as const;

/** Category weights for the overall score. MUST sum to 1. */
export const SCORE_WEIGHTS: Record<EditCategory, number> = {
	impact: 0.3,
	keywords: 0.25,
	clarity: 0.2,
	formatting: 0.15,
	length: 0.1,
};

export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

/** Clamp to an integer in `0..100`. NaN collapses to `MIN_SCORE`. */
export function clampScore(value: number): number {
	if (Number.isNaN(value)) {
		return MIN_SCORE;
	}
	return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(value)));
}

/**
 * Deterministic weighted overall score. The model never owns this number;
 * server code recomputes it from the (clamped) breakdown before persistence.
 */
export function calculateScoreOverall(breakdown: ResumeAnalysisScoreBreakdown): number {
	let total = 0;
	for (const key of Object.keys(SCORE_WEIGHTS) as EditCategory[]) {
		total += clampScore(breakdown[key]) * SCORE_WEIGHTS[key];
	}
	return clampScore(total);
}

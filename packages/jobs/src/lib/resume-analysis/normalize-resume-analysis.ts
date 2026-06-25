import {
	type EditCategory,
	type PriorAnalysisContext,
	type ResumeAnalysis,
	type ResumeAnalysisScoreBreakdown,
	type ResumeEdit,
	type ResumeUserInputRequest,
	resumeAnalysisScoreBreakdownKeys,
} from "@stackk-career/schemas/ai/resume-analysis";
import type { ResumeQualityGate } from "@stackk-career/schemas/ai/resume-quality-gates";
import { calculateScoreOverall, clampScore, MAX_SCORE, RUBRIC_VERSION } from "@stackk-career/schemas/ai/resume-scoring";
import type { ResumeSnapshot } from "@stackk-career/schemas/ai/resume-snapshot";

export type NormalizationChange =
	| { kind: "score_recomputed"; from: number; to: number }
	| { kind: "score_clamped"; category: EditCategory; from: number; to: number }
	| { kind: "gate_cap_applied"; category: EditCategory; gateId: string; from: number; to: number }
	| { kind: "edit_dropped_over_budget"; editId: string; category: EditCategory; delta: number }
	| { kind: "floor_applied"; category: EditCategory; from: number; to: number }
	| { kind: "applied_edit_stale"; editId: string; category: EditCategory };

export interface NormalizeResumeAnalysisInput {
	/** Edits already validated + enriched (editId, applyability, evidence) by the validator. */
	edits: ResumeEdit[];
	priorAnalysis?: PriorAnalysisContext;
	/** Deterministic rubric gates from the quality-gate evaluator. */
	qualityGates: ResumeQualityGate[];
	rubricVersion?: string;
	/** First-pass score estimate from the model. Only `scoreBreakdown` is read. */
	scoreBreakdown: ResumeAnalysisScoreBreakdown;
	/** Structured resume facts; `flatText` proves applied-edit content still exists. */
	snapshot: ResumeSnapshot;
	/** Requests for facts only the user can supply, gathered by the validator. */
	userInputRequests: ResumeUserInputRequest[];
}

export interface NormalizeResumeAnalysisResult {
	analysis: ResumeAnalysis;
	changes: NormalizationChange[];
}

const emptyCategoryRecord = (): Record<EditCategory, number> => ({
	impact: 0,
	keywords: 0,
	clarity: 0,
	formatting: 0,
	length: 0,
});

/**
 * Lowest cap per category across all BLOCKING gates (warnings never cap). A
 * category with no blocking gate keeps the full `MAX_SCORE` headroom.
 */
function buildGateCaps(gates: ResumeQualityGate[]): Record<EditCategory, { cap: number; gateId: string }> {
	const caps = {} as Record<EditCategory, { cap: number; gateId: string }>;
	for (const key of resumeAnalysisScoreBreakdownKeys) {
		caps[key] = { cap: MAX_SCORE, gateId: "" };
	}
	for (const gate of gates) {
		if (gate.severity === "blocking" && gate.cap < caps[gate.category].cap) {
			caps[gate.category] = { cap: gate.cap, gateId: gate.id };
		}
	}
	return caps;
}

/**
 * Category floors derived from prior applied edits, counted ONLY when the
 * improvement can still be proven in the current resume content. Unprovable
 * applied edits (deleted/reverted content) are reported as stale and ignored,
 * so a floor can never inflate a score for content the user later removed.
 */
function computeSafeFloors(
	prior: PriorAnalysisContext,
	resumeText: string,
	changes: NormalizationChange[]
): ResumeAnalysisScoreBreakdown {
	const safeDeltas = emptyCategoryRecord();

	for (const edit of prior.edits) {
		if (edit.status !== "applied") {
			continue;
		}
		// Without an `after`, the improvement (delete/informational) cannot be proven present.
		if (!edit.after) {
			continue;
		}
		if (resumeText.includes(edit.after)) {
			safeDeltas[edit.category] += edit.delta;
		} else {
			changes.push({ kind: "applied_edit_stale", editId: edit.editId, category: edit.category });
		}
	}

	const floors = {} as ResumeAnalysisScoreBreakdown;
	for (const key of resumeAnalysisScoreBreakdownKeys) {
		floors[key] = clampScore(prior.scoreBreakdown[key] + safeDeltas[key]);
	}
	return floors;
}

/**
 * Build the Spanish user question for a blocking gate whose remaining points are
 * unlocked only by facts the user supplies (dates, metrics, real placeholder values).
 */
function gateToUserInputRequest(gate: ResumeQualityGate, snapshot: ResumeSnapshot): ResumeUserInputRequest {
	const targetBlockId =
		(gate.id === "entries_missing_dates" ? snapshot.entriesMissingDates[0] : undefined) ??
		(gate.id === "placeholders_present" ? snapshot.placeholderBlockIds[0] : undefined);

	let question: string;
	if (gate.id === "entries_missing_dates") {
		question = "¿Cuáles son las fechas de inicio y fin (mes y año) de las experiencias que no las tienen?";
	} else if (gate.id === "no_measurable_achievement") {
		question = "¿Qué métricas reales puedes aportar de tus logros (números, porcentajes, montos, escala)?";
	} else {
		question = 'Hay valores de marcador en el currículum (p. ej. "X%"). ¿Cuáles son los valores reales?';
	}

	return {
		id: `uir_${gate.id}`,
		category: gate.category,
		question,
		whyItMatters: gate.description,
		targetBlockId: targetBlockId ?? null,
		unlocksPotentialPoints: clampScore(MAX_SCORE - gate.cap),
	};
}

/** Steps 1-3: clamp sub-scores, raise to safe applied-edit floors, then apply blocking gate caps. */
function computeFinalBreakdown(
	scoreBreakdown: ResumeAnalysisScoreBreakdown,
	priorAnalysis: PriorAnalysisContext | undefined,
	snapshot: ResumeSnapshot,
	gateCaps: Record<EditCategory, { cap: number; gateId: string }>,
	changes: NormalizationChange[]
): ResumeAnalysisScoreBreakdown {
	const breakdown = {} as ResumeAnalysisScoreBreakdown;
	for (const key of resumeAnalysisScoreBreakdownKeys) {
		const raw = scoreBreakdown[key];
		const clamped = clampScore(raw);
		if (clamped !== raw) {
			changes.push({ kind: "score_clamped", category: key, from: raw, to: clamped });
		}
		breakdown[key] = clamped;
	}

	if (priorAnalysis) {
		const floors = computeSafeFloors(priorAnalysis, snapshot.flatText, changes);
		for (const key of resumeAnalysisScoreBreakdownKeys) {
			if (floors[key] > breakdown[key]) {
				changes.push({ kind: "floor_applied", category: key, from: breakdown[key], to: floors[key] });
				breakdown[key] = floors[key];
			}
		}
	}

	// A hard gate cap always wins over a floor.
	for (const key of resumeAnalysisScoreBreakdownKeys) {
		const { cap, gateId } = gateCaps[key];
		if (breakdown[key] > cap) {
			changes.push({ kind: "gate_cap_applied", category: key, gateId, from: breakdown[key], to: cap });
			breakdown[key] = cap;
		}
	}
	return breakdown;
}

/**
 * Keep every informational edit; drop only one-click edits that are genuinely
 * unabsorbable (would push the raw category past 100). Gate caps deliberately
 * do NOT drop edits — a valid one-click polish stays visible even when a
 * separate structural gate caps the category; the ceiling re-caps the gain.
 */
function applyEditBudget(
	edits: ResumeEdit[],
	breakdown: ResumeAnalysisScoreBreakdown,
	changes: NormalizationChange[]
): ResumeEdit[] {
	const perCategory = emptyCategoryRecord();
	const keptEdits: ResumeEdit[] = [];
	for (const edit of edits) {
		if (edit.applyability !== "one_click") {
			keptEdits.push(edit);
			continue;
		}
		const projected = breakdown[edit.category] + perCategory[edit.category] + edit.delta;
		if (projected > MAX_SCORE) {
			changes.push({
				kind: "edit_dropped_over_budget",
				editId: edit.editId,
				category: edit.category,
				delta: edit.delta,
			});
			continue;
		}
		perCategory[edit.category] += edit.delta;
		keptEdits.push(edit);
	}
	return keptEdits;
}

/** Highest reachable breakdown from applying every kept one-click edit, re-capped by gates. */
function computeCeilingBreakdown(
	breakdown: ResumeAnalysisScoreBreakdown,
	keptEdits: ResumeEdit[],
	gateCaps: Record<EditCategory, { cap: number; gateId: string }>
): ResumeAnalysisScoreBreakdown {
	const ceiling = { ...breakdown };
	for (const edit of keptEdits) {
		if (edit.applyability === "one_click") {
			ceiling[edit.category] = Math.min(gateCaps[edit.category].cap, clampScore(ceiling[edit.category] + edit.delta));
		}
	}
	return ceiling;
}

/** Validator requests plus one per blocking gate that only the user can resolve, deduped by id. */
function mergeUserInputRequests(
	userInputRequests: ResumeUserInputRequest[],
	qualityGates: ResumeQualityGate[],
	snapshot: ResumeSnapshot
): ResumeUserInputRequest[] {
	const requestsById = new Map<string, ResumeUserInputRequest>();
	for (const request of userInputRequests) {
		requestsById.set(request.id, request);
	}
	for (const gate of qualityGates) {
		if (gate.severity === "blocking" && gate.resolvableBy === "user_input") {
			const request = gateToUserInputRequest(gate, snapshot);
			if (!requestsById.has(request.id)) {
				requestsById.set(request.id, request);
			}
		}
	}
	return [...requestsById.values()];
}

/**
 * Deterministic post-processing applied before persistence. Owns the score
 * contract the model cannot be trusted with: clamps sub-scores, raises them to
 * safe applied-edit floors, applies blocking quality-gate caps, drops one-click
 * edits that breach the category budget, recomputes the weighted overall, and
 * computes the gate-aware one-click ceiling with human-readable blockers.
 * Anti-hallucination validation and edit enrichment happen upstream in the
 * edit-candidate validator; this module never invents facts.
 */
export function normalizeResumeAnalysis({
	scoreBreakdown,
	edits,
	userInputRequests,
	qualityGates,
	snapshot,
	priorAnalysis,
	rubricVersion = RUBRIC_VERSION,
}: NormalizeResumeAnalysisInput): NormalizeResumeAnalysisResult {
	const changes: NormalizationChange[] = [];
	const gateCaps = buildGateCaps(qualityGates);

	const breakdown = computeFinalBreakdown(scoreBreakdown, priorAnalysis, snapshot, gateCaps, changes);
	const keptEdits = applyEditBudget(edits, breakdown, changes);
	const ceilingBreakdown = computeCeilingBreakdown(breakdown, keptEdits, gateCaps);
	const blockers = qualityGates.filter((gate) => gate.severity === "blocking").map((gate) => gate.title);

	const analysis: ResumeAnalysis = {
		rubricVersion,
		scoreOverall: calculateScoreOverall(breakdown),
		scoreBreakdown: breakdown,
		qualityGates,
		scoreCeiling: {
			scoreOverall: calculateScoreOverall(ceilingBreakdown),
			scoreBreakdown: ceilingBreakdown,
			blockers,
		},
		edits: keptEdits,
		userInputRequests: mergeUserInputRequests(userInputRequests, qualityGates, snapshot),
	};

	return { analysis, changes };
}

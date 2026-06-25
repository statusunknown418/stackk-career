import { createHash } from "node:crypto";
import type {
	EditCategory,
	ResumeEdit,
	ResumeEditDraft,
	ResumeEditEvidence,
	ResumeUserInputRequest,
} from "@stackk-career/schemas/ai/resume-analysis";
import { containsResumePlaceholder, type ResumeSnapshot } from "@stackk-career/schemas/ai/resume-snapshot";

export type EditRejectionReason =
	| "missing_target_block"
	| "before_not_found"
	| "placeholder_after"
	| "delete_contact"
	| "rewrite_missing_text"
	| "unsupported_fact";

export interface RejectedEditCandidate {
	category: EditCategory;
	detail?: string;
	editId: string;
	reason: EditRejectionReason;
}

export interface ValidateEditCandidatesResult {
	/** Enriched edits (one_click + informational), in input order, ready for the normalizer. */
	edits: ResumeEdit[];
	/** Why a one-click candidate was dropped or downgraded — observability only. */
	rejected: RejectedEditCandidate[];
	/** Facts only the user can supply; spawned by rejected metric/placeholder rewrites. */
	userInputRequests: ResumeUserInputRequest[];
}

/** A numeric magnitude (percentage core, currency core, or plain number). */
const MAGNITUDE_TOKEN_PATTERN = /\d+(?:[.,]\d+)?/g;

/** Stable id derived from the edit's identifying content, so re-runs are deterministic. */
function computeEditId(edit: ResumeEditDraft): string {
	const key = [
		edit.category,
		edit.action ?? "info",
		edit.targetBlockId ?? "",
		edit.title,
		edit.before ?? "",
		edit.after ?? "",
	].join("\u0000");
	return `edit_${createHash("sha1").update(key).digest("hex").slice(0, 12)}`;
}

/** Downgrade a draft to a non-applyable informational edit, preserving its advice and target. */
function informationalEdit(draft: ResumeEditDraft, editId: string): ResumeEdit {
	return {
		delta: draft.delta,
		category: draft.category,
		severity: draft.severity,
		title: draft.title,
		description: draft.description,
		targetBlockId: draft.targetBlockId ?? null,
		editId,
		applyability: "informational",
		evidence: [],
	};
}

/** A user question that unlocks the points this edit would have earned, instead of fabricating a value. */
function metricRequestFor(draft: ResumeEditDraft, editId: string): ResumeUserInputRequest {
	return {
		id: `uir_${editId}`,
		category: draft.category,
		question: `Para aplicar "${draft.title}" necesitamos un dato real. ¿Cuál es el valor concreto (número, porcentaje o monto) que corresponde?`,
		whyItMatters: draft.description,
		targetBlockId: draft.targetBlockId ?? null,
		unlocksPotentialPoints: draft.delta,
	};
}

interface EditValidationContext {
	allowedFactsText: string;
	blockIds: Set<number>;
	contactBlockId: number | null;
	fieldsByBlock: Map<number, string[]>;
}

/** Outcome of classifying one candidate: at most one edit, one rejection, one request. */
interface CandidateOutcome {
	edit?: ResumeEdit;
	rejection?: RejectedEditCandidate;
	request?: ResumeUserInputRequest;
}

/** Validate a "delete" candidate: target must exist and never be the contact block. */
function validateDeleteCandidate(
	draft: ResumeEditDraft,
	editId: string,
	targetBlockId: number | null,
	ctx: EditValidationContext
): CandidateOutcome {
	if (targetBlockId === null || !ctx.blockIds.has(targetBlockId)) {
		return { rejection: { editId, category: draft.category, reason: "missing_target_block" } };
	}
	if (targetBlockId === ctx.contactBlockId) {
		return { rejection: { editId, category: draft.category, reason: "delete_contact" } };
	}
	return {
		edit: {
			...draft,
			editId,
			applyability: "one_click",
			evidence: [{ source: "resume", blockId: targetBlockId, quote: draft.title }],
		},
	};
}

/** Validate a "rewrite" candidate: `before` must exist verbatim, `after` must carry only supported facts. */
function validateRewriteCandidate(
	draft: ResumeEditDraft,
	editId: string,
	targetBlockId: number | null,
	ctx: EditValidationContext
): CandidateOutcome {
	const before = draft.before;
	const after = draft.after;
	if (targetBlockId === null || !before || !after) {
		return {
			edit: informationalEdit(draft, editId),
			rejection: { editId, category: draft.category, reason: "rewrite_missing_text" },
		};
	}
	if (!ctx.blockIds.has(targetBlockId)) {
		return {
			edit: informationalEdit(draft, editId),
			rejection: { editId, category: draft.category, reason: "missing_target_block" },
		};
	}
	const fieldValues = ctx.fieldsByBlock.get(targetBlockId) ?? [];
	if (!fieldValues.some((value) => value.includes(before))) {
		return {
			edit: informationalEdit(draft, editId),
			rejection: { editId, category: draft.category, reason: "before_not_found", detail: before },
		};
	}
	if (containsResumePlaceholder(after)) {
		return {
			edit: informationalEdit(draft, editId),
			rejection: { editId, category: draft.category, reason: "placeholder_after", detail: after },
			request: metricRequestFor(draft, editId),
		};
	}
	const unsupportedToken = (after.match(MAGNITUDE_TOKEN_PATTERN) ?? []).find(
		(token) => !ctx.allowedFactsText.includes(token)
	);
	if (unsupportedToken !== undefined) {
		return {
			edit: informationalEdit(draft, editId),
			rejection: { editId, category: draft.category, reason: "unsupported_fact", detail: unsupportedToken },
			request: metricRequestFor(draft, editId),
		};
	}
	const evidence: ResumeEditEvidence[] = [{ source: "resume", blockId: targetBlockId, quote: before }];
	return { edit: { ...draft, editId, applyability: "one_click", evidence } };
}

/** Route a candidate to the right validator; informational advice (no action) passes straight through. */
function classifyCandidate(draft: ResumeEditDraft, editId: string, ctx: EditValidationContext): CandidateOutcome {
	if (!draft.action) {
		return { edit: informationalEdit(draft, editId) };
	}
	const targetBlockId = typeof draft.targetBlockId === "number" ? draft.targetBlockId : null;
	return draft.action === "delete"
		? validateDeleteCandidate(draft, editId, targetBlockId, ctx)
		: validateRewriteCandidate(draft, editId, targetBlockId, ctx);
}

/**
 * Validate model-proposed edit candidates against the deterministic resume
 * snapshot. Enforces the anti-hallucination contract the model cannot be
 * trusted with: a rewrite's `before` must exist verbatim in its target block,
 * its `after` must not be a placeholder, and any numeric magnitude in `after`
 * must already exist somewhere in the resume or job-target facts. Edits that
 * fail are downgraded to informational and, when they hinge on a missing fact,
 * surfaced as a user-input request rather than silently dropped.
 */
export function validateEditCandidates(
	drafts: ResumeEditDraft[],
	snapshot: ResumeSnapshot
): ValidateEditCandidatesResult {
	const fieldsByBlock = new Map<number, string[]>();
	for (const field of snapshot.textFields) {
		const values = fieldsByBlock.get(field.blockId) ?? [];
		values.push(field.value);
		fieldsByBlock.set(field.blockId, values);
	}
	const ctx: EditValidationContext = {
		allowedFactsText: `${snapshot.flatText}\n${snapshot.jobTarget?.keywords.join("\n") ?? ""}`,
		blockIds: new Set(snapshot.blockIds),
		contactBlockId: snapshot.contactBlockId,
		fieldsByBlock,
	};

	const edits: ResumeEdit[] = [];
	const userInputRequests: ResumeUserInputRequest[] = [];
	const rejected: RejectedEditCandidate[] = [];
	const seenIds = new Set<string>();

	for (const draft of drafts) {
		let editId = computeEditId(draft);
		let suffix = 1;
		while (seenIds.has(editId)) {
			editId = `${computeEditId(draft)}_${suffix}`;
			suffix += 1;
		}
		seenIds.add(editId);

		const outcome = classifyCandidate(draft, editId, ctx);
		if (outcome.edit) {
			edits.push(outcome.edit);
		}
		if (outcome.rejection) {
			rejected.push(outcome.rejection);
		}
		if (outcome.request) {
			userInputRequests.push(outcome.request);
		}
	}

	return { edits, userInputRequests, rejected };
}

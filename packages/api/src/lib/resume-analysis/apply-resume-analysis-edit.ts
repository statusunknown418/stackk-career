import { ORPCError } from "@orpc/server";
import {
	type ResumeAnalysisEditStatuses,
	type ResumeAnalysisEditStatusRecord,
	resumeAnalyses,
} from "@stackk-career/db/schema/resume-analyses";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { type ResumeEdit, resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import {
	applyRewriteToBlockContent,
	type Block,
	mapParseBlocks,
	parseBlock,
} from "@stackk-career/schemas/db/resume-blocks";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "../../context";
import { sanitizeBlockContentForWrite, softDeleteBlockSubtree } from "../resume-block-write";

type Database = Context["db"];

/** Result of attempting to apply a single edit. */
export type ApplyEditOutcome = "applied" | "skipped" | "stale" | "failed";

export interface ApplyEditResult {
	editId: string;
	/** Machine reason for a non-applied outcome, e.g. `already_applied`, `before_not_found`. */
	reason?: string;
	status: ApplyEditOutcome;
}

/** A block whose content changed so the client can sync its live form copy. */
export interface AppliedRewrite {
	blockId: number;
	content: unknown;
}

export interface ApplyResumeAnalysisEditsResult {
	deletedRootBlockIds: number[];
	editStatuses: ResumeAnalysisEditStatuses;
	results: ApplyEditResult[];
	rewrites: AppliedRewrite[];
}

export interface ApplyResumeAnalysisEditsArgs {
	analysisId: string;
	/** Edits to apply in order. Omit to apply every one-click edit (apply-all). */
	editIds?: string[];
	userId: string;
}

interface ApplyState {
	blockById: Map<number, Block>;
	blocks: Block[];
	contactBlockId: number | null;
	db: Database;
	deletedIds: Set<number>;
	deletedRootBlockIds: number[];
	resumeId: string;
	rewrites: AppliedRewrite[];
	userId: string;
}

/** Ids of `rootId` and every descendant, derived from static parent links (soft deletes never move blocks). */
function collectSubtreeIds(blocks: Block[], rootId: number): Set<number> {
	const childrenByParent = new Map<number, number[]>();
	for (const block of blocks) {
		const parentId = block.parentBlockId;
		if (parentId === null || parentId === undefined) {
			continue;
		}
		const siblings = childrenByParent.get(parentId) ?? [];
		siblings.push(block.id);
		childrenByParent.set(parentId, siblings);
	}

	const ids = new Set<number>();
	const stack: number[] = [rootId];
	while (stack.length > 0) {
		const id = stack.pop();
		if (id === undefined || ids.has(id)) {
			continue;
		}
		ids.add(id);
		for (const child of childrenByParent.get(id) ?? []) {
			stack.push(child);
		}
	}
	return ids;
}

/** Apply a one-click `delete` edit: soft-delete the target subtree, never the contact block. */
async function applyDeleteEdit(state: ApplyState, edit: ResumeEdit): Promise<ApplyEditResult> {
	const targetId = edit.targetBlockId ?? null;
	if (targetId === null) {
		return { editId: edit.editId, status: "failed", reason: "missing_target_block" };
	}
	if (targetId === state.contactBlockId) {
		return { editId: edit.editId, status: "failed", reason: "delete_contact" };
	}
	if (state.deletedIds.has(targetId) || !state.blockById.has(targetId)) {
		return { editId: edit.editId, status: "stale", reason: "block_not_found" };
	}

	const rowsAffected = await softDeleteBlockSubtree(state.db, {
		blockId: targetId,
		resumeId: state.resumeId,
		userId: state.userId,
	});
	if (rowsAffected === 0) {
		return { editId: edit.editId, status: "stale", reason: "block_not_found" };
	}

	for (const removedId of collectSubtreeIds(state.blocks, targetId)) {
		state.deletedIds.add(removedId);
		state.blockById.delete(removedId);
	}
	state.deletedRootBlockIds.push(targetId);
	return { editId: edit.editId, status: "applied" };
}

/** Apply a one-click `rewrite` edit: swap `before`→`after` in the live target block, then persist. */
async function applyRewriteEdit(state: ApplyState, edit: ResumeEdit): Promise<ApplyEditResult> {
	const targetId = edit.targetBlockId ?? null;
	if (targetId === null || !(edit.before && edit.after)) {
		return { editId: edit.editId, status: "failed", reason: "rewrite_missing_text" };
	}
	const block = state.blockById.get(targetId);
	if (!block || state.deletedIds.has(targetId)) {
		return { editId: edit.editId, status: "stale", reason: "block_not_found" };
	}

	const nextContent = applyRewriteToBlockContent(block, edit.before, edit.after);
	if (nextContent === null) {
		return { editId: edit.editId, status: "stale", reason: "before_not_found" };
	}

	const sanitized = sanitizeBlockContentForWrite({
		blockType: block.blockType,
		content: nextContent as Record<string, unknown>,
	});
	const [updated] = await state.db
		.update(resumeBlocks)
		.set({ content: sanitized })
		.where(and(eq(resumeBlocks.id, targetId), eq(resumeBlocks.resumeId, state.resumeId)))
		.returning();
	if (!updated) {
		return { editId: edit.editId, status: "stale", reason: "block_not_found" };
	}

	const parsedUpdated = parseBlock(updated);
	state.blockById.set(targetId, parsedUpdated);
	state.rewrites.push({ blockId: targetId, content: parsedUpdated.content });
	return { editId: edit.editId, status: "applied" };
}

/** Route a single edit to the right applier, isolating unexpected DB errors as a `failed` result. */
async function applyOneEdit(
	state: ApplyState,
	edit: ResumeEdit,
	statuses: ResumeAnalysisEditStatuses
): Promise<ApplyEditResult> {
	if (statuses[edit.editId]?.status === "applied") {
		return { editId: edit.editId, status: "skipped", reason: "already_applied" };
	}
	if (statuses[edit.editId]?.status === "dismissed") {
		return { editId: edit.editId, status: "skipped", reason: "dismissed" };
	}
	if (edit.applyability !== "one_click") {
		return { editId: edit.editId, status: "skipped", reason: "not_one_click" };
	}

	try {
		if (edit.action === "delete") {
			return await applyDeleteEdit(state, edit);
		}
		if (edit.action === "rewrite") {
			return await applyRewriteEdit(state, edit);
		}
		return { editId: edit.editId, status: "skipped", reason: "no_action" };
	} catch (error) {
		return {
			editId: edit.editId,
			status: "failed",
			reason: error instanceof Error ? error.message : "apply_failed",
		};
	}
}

/** Build the ledger record persisted for a given apply outcome (skipped outcomes keep the prior record). */
function statusRecordFor(result: ApplyEditResult): ResumeAnalysisEditStatusRecord | null {
	switch (result.status) {
		case "applied":
			return { status: "applied", appliedAt: Date.now() };
		case "stale":
			return { status: "stale", error: result.reason };
		case "failed":
			return { status: "failed", error: result.reason };
		default:
			return null;
	}
}

/**
 * Apply Casey edits to a resume server-side: validate each against the CURRENT
 * persisted blocks, mutate content/delete subtrees, and record the per-edit
 * outcome in the analysis edit ledger — all owned by one server operation so a
 * failed or stale mutation can never be marked `applied`. Edits run in order so
 * a later edit sees earlier edits' effects (overlapping rewrites stale safely).
 *
 * Omitting `editIds` applies every one-click edit (apply-all). Returns the new
 * ledger plus the concrete block mutations so the client can sync its form.
 */
export async function applyResumeAnalysisEdits(
	db: Database,
	args: ApplyResumeAnalysisEditsArgs
): Promise<ApplyResumeAnalysisEditsResult> {
	const [row] = await db
		.select({
			id: resumeAnalyses.id,
			resumeId: resumeAnalyses.resumeId,
			object: resumeAnalyses.object,
			editStatuses: resumeAnalyses.editStatuses,
		})
		.from(resumeAnalyses)
		.where(and(eq(resumeAnalyses.id, args.analysisId), eq(resumeAnalyses.userId, args.userId)))
		.limit(1);

	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "Analysis not found" });
	}
	if (!row.resumeId) {
		throw new ORPCError("CONFLICT", { message: "Analysis is not linked to a resume" });
	}

	const parsed = resumeAnalysisSchema.safeParse(row.object);
	if (!parsed.success) {
		throw new ORPCError("CONFLICT", { message: "Analysis result is outdated; re-run the analysis" });
	}
	const analysis = parsed.data;
	const editsById = new Map(analysis.edits.map((edit) => [edit.editId, edit]));

	const rawBlocks = await db
		.select()
		.from(resumeBlocks)
		.where(and(eq(resumeBlocks.resumeId, row.resumeId), isNull(resumeBlocks.deletedAt)));
	const blocks = mapParseBlocks(rawBlocks);

	const state: ApplyState = {
		db,
		resumeId: row.resumeId,
		userId: args.userId,
		blockById: new Map(blocks.map((block) => [block.id, block])),
		deletedIds: new Set<number>(),
		contactBlockId: blocks.find((block) => block.blockType === "contact")?.id ?? null,
		blocks,
		rewrites: [],
		deletedRootBlockIds: [],
	};

	const orderedEditIds =
		args.editIds ?? analysis.edits.filter((edit) => edit.applyability === "one_click").map((edit) => edit.editId);

	const statuses: ResumeAnalysisEditStatuses = { ...row.editStatuses };
	const results: ApplyEditResult[] = [];
	let changed = false;

	for (const editId of orderedEditIds) {
		const edit = editsById.get(editId);
		if (!edit) {
			results.push({ editId, status: "failed", reason: "edit_not_found" });
			continue;
		}
		const result = await applyOneEdit(state, edit, statuses);
		results.push(result);
		const record = statusRecordFor(result);
		if (record) {
			statuses[editId] = record;
			changed = true;
		}
	}

	if (changed) {
		await db.update(resumeAnalyses).set({ editStatuses: statuses }).where(eq(resumeAnalyses.id, args.analysisId));
	}

	return {
		editStatuses: statuses,
		results,
		rewrites: state.rewrites,
		deletedRootBlockIds: state.deletedRootBlockIds,
	};
}

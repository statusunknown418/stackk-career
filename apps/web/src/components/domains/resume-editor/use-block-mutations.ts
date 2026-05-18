"use client";

import type { CreateBlockApiMutationInput, DeleteBlockApiMutationInput } from "@stackk-career/schemas/api/blocks";
import type { ResumeDocumentWrapperForm } from "@stackk-career/schemas/api/resumes";
import { generateLexoKeyBetween } from "@stackk-career/schemas/utils/lexographical";
import { useMutation } from "@tanstack/react-query";
import { constructNow } from "date-fns";
import { useCallback } from "react";
import { toast } from "sonner";
import type { ResumeFormApi } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc, queryClient } from "@/utils/orpc";
import { getBlockKey, migrateBlockKey, releaseBlockKey } from "../resume-document/block-key-registry";

let nextOptimisticBlockId = -1;
export const optimisticBlockId = () => nextOptimisticBlockId--;

type ResumeBlock = ResumeDocumentWrapperForm["blocks"][number];

interface CreatedBlock {
	id: number;
}

interface CreateDeferred {
	promise: Promise<CreatedBlock>;
	reject: (reason: unknown) => void;
	resolve: (value: CreatedBlock) => void;
}

// Shared across hooks so a pending delete can wait for its sibling create to
// land (and learn the real server id) instead of POSTing a still-optimistic id.
const pendingCreates = new Map<number, CreateDeferred>();

// Module-scoped so concurrent `useCreateBlock` instances (e.g. two sections both
// appending an entry on the same tick) serialize through one queue. Per-hook
// chains would race to read the same cached tail position and mint duplicate
// lexo keys.
let createChain: Promise<unknown> = Promise.resolve();

const isOrpcNotFound = (err: unknown): boolean =>
	typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "NOT_FOUND";

const createDeferred = (): CreateDeferred => {
	let resolve!: (value: CreatedBlock) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<CreatedBlock>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

interface CreateContext {
	deferred: CreateDeferred | null;
	optimisticId: number;
	previousResume: ReturnType<typeof queryClient.getQueryData> extends infer T ? T | undefined : undefined;
}

interface UseCreateBlockOptions {
	form: ResumeFormApi;
}

const isSiblingOfParent = (block: { parentBlockId: number | null }, parentBlockId: number | null) =>
	(block.parentBlockId ?? null) === (parentBlockId ?? null);

const resolveInsertionWindow = (
	input: CreateBlockApiMutationInput,
	previousBlocks: ResumeBlock[]
): { before: string | null; after: string | null } => {
	const providedBefore = input.before ?? null;
	const providedAfter = input.after ?? null;
	// Caller specified at least one neighbor: honor exactly. Don't derive the
	// missing side from siblings — caller's intent is "insert against this
	// neighbor", not "fill the rest of the row".
	if (providedBefore !== null || providedAfter !== null) {
		return { before: providedBefore, after: providedAfter };
	}
	// Neither neighbor: tail-append against current siblings.
	const siblings = previousBlocks.filter((block) => isSiblingOfParent(block, input.parentBlockId ?? null));
	return { before: siblings.at(-1)?.position ?? null, after: null };
};

const buildOptimisticBlock = (input: CreateBlockApiMutationInput, previousBlocks: ResumeBlock[]): ResumeBlock => {
	const { before, after } = resolveInsertionWindow(input, previousBlocks);
	const now = constructNow(new Date());

	return {
		blockType: input.blockType,
		content: input.content,
		createdAt: now,
		deletedAt: null,
		id: optimisticBlockId(),
		isHidden: false,
		parentBlockId: input.parentBlockId ?? null,
		position: generateLexoKeyBetween(before, after),
		resumeId: input.resumeId,
		sourceBlockId: null,
		updatedAt: now,
		version: 1,
	} as ResumeBlock;
};

const findBlockIndexById = (blocks: ResumeBlock[], id: number) => blocks.findIndex((block) => block.id === id);

export const useCreateBlock = ({ form }: UseCreateBlockOptions) => {
	const params = Route.useParams();
	const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: params.resumeId } });

	const mutation = useMutation(
		orpc.blocks.create.mutationOptions({
			onMutate: async (input) => {
				await queryClient.cancelQueries({ queryKey: resumeQuery.queryKey });
				const previousResume = queryClient.getQueryData(resumeQuery.queryKey);

				if (!previousResume) {
					return { deferred: null, optimisticId: 0, previousResume } satisfies CreateContext;
				}

				const optimisticBlock = buildOptimisticBlock(
					input as unknown as CreateBlockApiMutationInput,
					previousResume.blocks as ResumeBlock[]
				);

				const deferred = createDeferred();
				pendingCreates.set(optimisticBlock.id, deferred);

				// Seed a stable React key for this optimistic id; `onSuccess` migrates it
				// to the real id so consumers iterating with `getBlockKey(block.id)` never
				// see the key change across the id swap (would otherwise remount inputs).
				getBlockKey(optimisticBlock.id);

				queryClient.setQueryData(resumeQuery.queryKey, {
					...previousResume,
					activeBlockTypes: previousResume.activeBlockTypes.includes(input.blockType)
						? previousResume.activeBlockTypes
						: [...previousResume.activeBlockTypes, input.blockType],
					blocks: [...previousResume.blocks, optimisticBlock],
				});

				form.pushFieldValue("blocks", optimisticBlock);

				return { deferred, optimisticId: optimisticBlock.id, previousResume } satisfies CreateContext;
			},
			onSuccess: async (created, _input, context) => {
				if (!context?.optimisticId) {
					return;
				}

				const optimisticId = context.optimisticId;
				context.deferred?.resolve({ id: created.id });
				pendingCreates.delete(optimisticId);

				// Move the key BEFORE the cache/form id swap so the next render reads the
				// same uuid under `created.id` that it previously read under the optimistic id.
				migrateBlockKey(optimisticId, created.id);

				queryClient.setQueryData(resumeQuery.queryKey, (prev) =>
					prev
						? {
								...prev,
								blocks: prev.blocks.map((block) => (block.id === optimisticId ? created : block)),
							}
						: prev
				);

				const formBlocks = form.state.values.blocks;
				const idx = findBlockIndexById(formBlocks, optimisticId);
				if (idx !== -1) {
					form.setFieldValue(`blocks[${idx}].id`, created.id);
					form.setFieldValue(`blocks[${idx}].position`, created.position);
					form.setFieldValue(`blocks[${idx}].createdAt`, created.createdAt);
					form.setFieldValue(`blocks[${idx}].updatedAt`, created.updatedAt);
				}

				// Sections also create a starter child server-side; pull it into cache + form.
				// Skip the refetch if the section was already optimistically deleted while
				// the create was in flight — invalidation would resurrect it.
				if (created.blockType === "section") {
					const cached = queryClient.getQueryData(resumeQuery.queryKey);
					const stillPresent = cached?.blocks.some((block) => block.id === created.id) ?? false;
					if (stillPresent) {
						await queryClient.invalidateQueries({ queryKey: resumeQuery.queryKey });
					}
				}
			},
			onError: async (error, _input, context) => {
				toast.error(error.message || "No se pudo crear el bloque.");
				if (context?.previousResume) {
					queryClient.setQueryData(resumeQuery.queryKey, context.previousResume);
				}
				if (context?.optimisticId) {
					context.deferred?.reject(error);
					pendingCreates.delete(context.optimisticId);
					releaseBlockKey(context.optimisticId);
					const idx = findBlockIndexById(form.state.values.blocks, context.optimisticId);
					if (idx !== -1) {
						await form.removeFieldValue("blocks", idx);
					}
				}
			},
			// Defensive cleanup: if react-query cancels the mutation before either
			// success/error fires, the deferred would leak and any waiting delete
			// for this optimistic id would hang. Reject + drop the map entry here.
			onSettled: (_data, _error, _input, context) => {
				const ctx = context as CreateContext | undefined;
				if (!ctx?.optimisticId) {
					return;
				}
				if (pendingCreates.has(ctx.optimisticId)) {
					ctx.deferred?.reject(new Error("Create mutation settled without resolution"));
					pendingCreates.delete(ctx.optimisticId);
				}
			},
		})
	);

	// Serialize successive calls so each request sees the freshest cache state when computing
	// `before`. Without this, two rapid clicks would race on the same tail position and the
	// server would emit duplicate lexo keys for sibling rows. Only refresh `before` from cache
	// when the caller did NOT specify any neighbor — explicit windows must be honored verbatim.
	const enqueue = useCallback(
		(input: CreateBlockApiMutationInput) => {
			const next = createChain
				.then(() => {
					const hasExplicitNeighbor = (input.before ?? null) !== null || (input.after ?? null) !== null;
					if (hasExplicitNeighbor) {
						return mutation.mutateAsync(input);
					}
					const cached = queryClient.getQueryData(resumeQuery.queryKey);
					const siblings = cached?.blocks.filter((block) => isSiblingOfParent(block, input.parentBlockId ?? null));
					const freshBefore = siblings?.at(-1)?.position ?? null;
					return mutation.mutateAsync({ ...input, before: freshBefore });
				})
				.catch(() => undefined);
			createChain = next;
			return next;
		},
		[mutation, resumeQuery.queryKey]
	);

	return Object.assign(mutation, {
		enqueue,
	});
};

interface DeleteContext {
	previousResume: ReturnType<typeof queryClient.getQueryData> extends infer T ? T | undefined : undefined;
}

const collectSubtreeIds = (blocks: { id: number; parentBlockId: number | null }[], rootId: number): Set<number> => {
	const ids = new Set<number>([rootId]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const block of blocks) {
			if (block.parentBlockId !== null && ids.has(block.parentBlockId) && !ids.has(block.id)) {
				ids.add(block.id);
				changed = true;
			}
		}
	}
	return ids;
};

interface UseDeleteBlockOptions {
	form: ResumeFormApi;
}

export const useDeleteBlock = ({ form }: UseDeleteBlockOptions) => {
	const params = Route.useParams();
	const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: params.resumeId } });

	const baseDeleteOptions = orpc.blocks.delete.mutationOptions({});
	const originalDeleteFn = baseDeleteOptions.mutationFn;

	return useMutation(
		orpc.blocks.delete.mutationOptions({
			mutationFn: async (input, mutationContext) => {
				if (!originalDeleteFn) {
					return { id: input.id };
				}
				const runDelete = async (id: number) => {
					try {
						return await originalDeleteFn({ ...input, id }, mutationContext);
					} catch (err) {
						// Idempotent delete: the block is already gone (double-click,
						// stale cache, prior delete in flight). Treat as success so the
						// onError rollback doesn't resurrect a row the user already
						// dismissed.
						if (isOrpcNotFound(err)) {
							return { id };
						}
						throw err;
					}
				};
				if (input.id < 0) {
					const pending = pendingCreates.get(input.id);
					if (!pending) {
						// Create never enqueued (or already rolled back) — nothing to delete server-side.
						return { id: input.id };
					}
					let createdId: number;
					try {
						const created = await pending.promise;
						createdId = created.id;
					} catch {
						// Sibling create rejected → nothing was persisted, optimistic
						// removal already reflects the desired state.
						return { id: input.id };
					}
					return await runDelete(createdId);
				}
				return await runDelete(input.id);
			},
			onMutate: async (input: DeleteBlockApiMutationInput) => {
				await queryClient.cancelQueries({ queryKey: resumeQuery.queryKey });
				const previousResume = queryClient.getQueryData(resumeQuery.queryKey);

				if (!previousResume) {
					return { previousResume } satisfies DeleteContext;
				}

				const toRemove = collectSubtreeIds(previousResume.blocks, input.id);

				queryClient.setQueryData(resumeQuery.queryKey, {
					...previousResume,
					blocks: previousResume.blocks.filter((block) => !toRemove.has(block.id)),
				});

				for (const removedId of toRemove) {
					releaseBlockKey(removedId);
				}

				const indices: number[] = [];
				const formBlocks = form.state.values.blocks;
				for (let i = formBlocks.length - 1; i >= 0; i--) {
					const blockId = formBlocks[i]?.id;
					if (blockId !== undefined && toRemove.has(blockId)) {
						indices.push(i);
					}
				}
				for (const index of indices) {
					await form.removeFieldValue("blocks", index);
				}

				return { previousResume } satisfies DeleteContext;
			},
			onError: (error, _variables, context) => {
				toast.error(error.message || "No se pudo eliminar el bloque.");
				if (context?.previousResume) {
					queryClient.setQueryData(resumeQuery.queryKey, context.previousResume);
				}
				// Rollback form state by re-syncing from the restored cache via reconcile in the route effect.
			},
		})
	);
};

export type CreateBlockInput = CreateBlockApiMutationInput;

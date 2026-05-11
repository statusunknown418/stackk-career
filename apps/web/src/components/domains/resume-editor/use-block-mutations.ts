"use client";

import type { CreateBlockApiMutationInput, DeleteBlockApiMutationInput } from "@stackk-career/schemas/api/blocks";
import type { ResumeDocumentWrapperForm } from "@stackk-career/schemas/api/resumes";
import { generateLexoKeyBetween } from "@stackk-career/schemas/utils/lexographical";
import { useMutation } from "@tanstack/react-query";
import { constructNow } from "date-fns";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { ResumeFormApi } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc, queryClient } from "@/utils/orpc";

let nextOptimisticBlockId = -1;
export const optimisticBlockId = () => nextOptimisticBlockId--;

type ResumeBlock = ResumeDocumentWrapperForm["blocks"][number];

interface CreateContext {
	optimisticId: number;
	previousResume: ReturnType<typeof queryClient.getQueryData> extends infer T ? T | undefined : undefined;
}

interface UseCreateBlockOptions {
	form: ResumeFormApi;
}

const isSiblingOfParent = (block: { parentBlockId: number | null }, parentBlockId: number | null) =>
	(block.parentBlockId ?? null) === (parentBlockId ?? null);

const buildOptimisticBlock = (input: CreateBlockApiMutationInput, previousBlocks: ResumeBlock[]): ResumeBlock => {
	const siblings = previousBlocks.filter((block) => isSiblingOfParent(block, input.parentBlockId ?? null));
	const before = input.before ?? siblings.at(-1)?.position ?? null;
	const after = input.after ?? null;
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
	const chainRef = useRef<Promise<unknown>>(Promise.resolve());

	const mutation = useMutation(
		orpc.blocks.create.mutationOptions({
			onMutate: async (input) => {
				await queryClient.cancelQueries({ queryKey: resumeQuery.queryKey });
				const previousResume = queryClient.getQueryData(resumeQuery.queryKey);

				if (!previousResume) {
					return { optimisticId: 0, previousResume } satisfies CreateContext;
				}

				const optimisticBlock = buildOptimisticBlock(
					input as unknown as CreateBlockApiMutationInput,
					previousResume.blocks as ResumeBlock[]
				);

				queryClient.setQueryData(resumeQuery.queryKey, {
					...previousResume,
					activeBlockTypes: previousResume.activeBlockTypes.includes(input.blockType)
						? previousResume.activeBlockTypes
						: [...previousResume.activeBlockTypes, input.blockType],
					blocks: [...previousResume.blocks, optimisticBlock],
				});

				form.pushFieldValue("blocks", optimisticBlock);

				return { optimisticId: optimisticBlock.id, previousResume } satisfies CreateContext;
			},
			onSuccess: async (created, _input, context) => {
				if (!context?.optimisticId) {
					return;
				}

				const optimisticId = context.optimisticId;

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
				if (created.blockType === "section") {
					await queryClient.invalidateQueries({ queryKey: resumeQuery.queryKey });
				}
			},
			onError: async (error, _input, context) => {
				toast.error(error.message || "No se pudo crear el bloque.");
				if (context?.previousResume) {
					queryClient.setQueryData(resumeQuery.queryKey, context.previousResume);
				}
				if (context?.optimisticId) {
					const idx = findBlockIndexById(form.state.values.blocks, context.optimisticId);
					if (idx !== -1) {
						await form.removeFieldValue("blocks", idx);
					}
				}
			},
		})
	);

	// Serialize successive calls so each request sees the freshest cache state when computing
	// `before`. Without this, two rapid clicks would race on the same tail position and the
	// server would emit duplicate lexo keys for sibling rows.
	const enqueue = useCallback(
		(input: CreateBlockApiMutationInput) => {
			const next = chainRef.current
				.then(() => {
					const cached = queryClient.getQueryData(resumeQuery.queryKey);
					const siblings = cached?.blocks.filter((block) => isSiblingOfParent(block, input.parentBlockId ?? null));
					const freshBefore = input.before ?? siblings?.at(-1)?.position ?? null;
					return mutation.mutateAsync({ ...input, before: freshBefore });
				})
				.catch(() => undefined);
			chainRef.current = next;
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
	removedFormIndices: number[];
}

interface UseDeleteBlockOptions {
	form: ResumeFormApi;
}

export const useDeleteBlock = ({ form }: UseDeleteBlockOptions) => {
	const params = Route.useParams();
	const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: params.resumeId } });

	return useMutation(
		orpc.blocks.delete.mutationOptions({
			onMutate: async (input: DeleteBlockApiMutationInput) => {
				await queryClient.cancelQueries({ queryKey: resumeQuery.queryKey });
				const previousResume = queryClient.getQueryData(resumeQuery.queryKey);

				if (!previousResume) {
					return { previousResume, removedFormIndices: [] } satisfies DeleteContext;
				}

				const toRemove = new Set<number>([input.id]);
				let changed = true;
				while (changed) {
					changed = false;
					for (const block of previousResume.blocks) {
						if (block.parentBlockId !== null && toRemove.has(block.parentBlockId) && !toRemove.has(block.id)) {
							toRemove.add(block.id);
							changed = true;
						}
					}
				}

				queryClient.setQueryData(resumeQuery.queryKey, {
					...previousResume,
					blocks: previousResume.blocks.filter((block) => !toRemove.has(block.id)),
				});

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

				return { previousResume, removedFormIndices: indices } satisfies DeleteContext;
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

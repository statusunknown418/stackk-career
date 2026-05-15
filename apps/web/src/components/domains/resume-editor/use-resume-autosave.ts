"use client";

import type { ResumeDocumentWrapperForm } from "@stackk-career/schemas/api/resumes";
import { findBlockById, hasBlockChanged, replaceBlockById } from "@stackk-career/schemas/db/resume-blocks";
import { AsyncDebouncer, useAsyncDebouncer, useAsyncQueuer } from "@tanstack/react-pacer";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

export type SaveStatus = "error" | "idle" | "saved" | "saving";

type ResumeBlock = ResumeDocumentWrapperForm["blocks"][number];
type BlockSaveFn = (blockId: number) => Promise<void>;
type SaveJob = { blockId: number; kind: "block" } | { kind: "title"; title: string };
type SaveJobOutcome = "error" | "saved" | "skipped";

const SAVE_DEBOUNCE_MS = 800;
const SAVED_DISPLAY_MS = 1600;

const isSameSaveJob = (left: SaveJob, right: SaveJob) => {
	if (left.kind !== right.kind) {
		return false;
	}

	if (left.kind === "block") {
		return right.kind === "block" && left.blockId === right.blockId;
	}

	return right.kind === "title" && left.title === right.title;
};

const updateListResumeTitle = (resumeId: string, title: string, updatedAt: Date) => {
	const listQuery = orpc.resumes.list.queryOptions();
	queryClient.setQueryData(
		listQuery.queryKey,
		(previous) =>
			previous?.map((resume) => (resume.id === resumeId ? { ...resume, title, updatedAt } : resume)) ?? previous
	);
};

interface UseResumeAutosaveArgs {
	getValues: () => ResumeDocumentWrapperForm;
	initialValues: ResumeDocumentWrapperForm;
	resumeId: string;
	setTitle: (title: string) => void;
}

export function useResumeAutosave({ getValues, initialValues, resumeId, setTitle }: UseResumeAutosaveArgs) {
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const blockSaveDebouncersRef = useRef(new Map<number, AsyncDebouncer<BlockSaveFn>>());
	const lastSavedRef = useRef<ResumeDocumentWrapperForm>(initialValues);

	const titleMutation = useMutation(orpc.resumes.updateTitle.mutationOptions());
	const blockMutation = useMutation(orpc.blocks.update.mutationOptions());

	const disposeBlockSaveDebouncer = (blockId: number) => {
		const debouncer = blockSaveDebouncersRef.current.get(blockId);

		if (!debouncer) {
			return;
		}

		debouncer.cancel();
		debouncer.abort();
		blockSaveDebouncersRef.current.delete(blockId);
	};

	const clearBlockSaveDebouncers = () => {
		for (const blockId of blockSaveDebouncersRef.current.keys()) {
			disposeBlockSaveDebouncer(blockId);
		}
	};

	const pruneBlockSaveDebouncers = (blocks: ResumeBlock[]) => {
		const validBlockIds = new Set(blocks.map((block) => block.id));

		for (const blockId of blockSaveDebouncersRef.current.keys()) {
			if (!validBlockIds.has(blockId)) {
				disposeBlockSaveDebouncer(blockId);
			}
		}
	};

	const getResumeQuery = () => orpc.resumes.get.queryOptions({ input: { id: resumeId } });

	const saveStatusResetDebouncer = useAsyncDebouncer(
		() => {
			setSaveStatus("idle");
			return Promise.resolve();
		},
		{ wait: SAVED_DISPLAY_MS }
	);

	const beginSave = () => {
		saveStatusResetDebouncer.cancel();
		setSaveStatus("saving");
	};

	const settleSaveStatus = (outcome: SaveJobOutcome, pendingJobCount: number) => {
		if (outcome === "error") {
			setSaveStatus("error");
			return;
		}

		if (pendingJobCount > 0) {
			return;
		}

		setSaveStatus("saved");
		saveStatusResetDebouncer.maybeExecute().catch(() => undefined);
	};

	const enqueueSaveJob = (job: SaveJob) => {
		if (job.kind === "block" && !findBlockById(getValues().blocks, job.blockId)) {
			disposeBlockSaveDebouncer(job.blockId);
			return;
		}

		const hasEquivalentPendingJob = saveQueue.peekPendingItems().some((pendingJob) => isSameSaveJob(pendingJob, job));

		if (hasEquivalentPendingJob) {
			return;
		}

		// React StrictMode dev double-mount fires the unmount cleanup once after the
		// first mount, which would leave the (reused) queuer instance permanently
		// stopped. Restart it defensively so processing resumes after remount.
		if (!saveQueue.store.state.isRunning) {
			saveQueue.start();
		}

		saveQueue.addItem(job);
	};

	const updateCachedTitle = (title: string, updatedAt: Date) => {
		const resumeQuery = getResumeQuery();
		queryClient.setQueryData(resumeQuery.queryKey, (previous) =>
			previous ? { ...previous, title, updatedAt } : previous
		);
		updateListResumeTitle(resumeId, title, updatedAt);
	};

	const updateCachedBlock = (updatedBlock: ResumeBlock) => {
		const resumeQuery = getResumeQuery();
		queryClient.setQueryData(resumeQuery.queryKey, (previous) =>
			previous
				? {
						...previous,
						blocks: replaceBlockById(previous.blocks as ResumeBlock[], updatedBlock),
					}
				: previous
		);
	};

	const persistTitle = async (title: string) => {
		if (title === lastSavedRef.current.title.trim()) {
			return "skipped" as const;
		}

		beginSave();

		try {
			const updatedResume = await titleMutation.mutateAsync({
				id: resumeId,
				title,
			});

			lastSavedRef.current = {
				...lastSavedRef.current,
				title: updatedResume.title,
			};
			updateCachedTitle(updatedResume.title, updatedResume.updatedAt);
			return "saved" as const;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo guardar el título");
			return "error" as const;
		}
	};

	const persistBlock = async (blockId: number) => {
		const currentBlock = findBlockById(getValues().blocks, blockId);
		const savedBlock = findBlockById(lastSavedRef.current.blocks, blockId);

		if (!currentBlock) {
			disposeBlockSaveDebouncer(blockId);
			return "skipped" as const;
		}

		// Optimistic blocks carry a negative placeholder id until the create mutation
		// resolves. Saving with that id would 404 on the server. Skip here; the id
		// swap in `useCreateBlock.onSuccess` triggers an onChange that re-queues this
		// save under the real id, picking up any keystrokes typed during creation.
		if (currentBlock.id < 0) {
			return "skipped" as const;
		}

		if (!(currentBlock && hasBlockChanged(currentBlock, savedBlock))) {
			return "skipped" as const;
		}

		beginSave();

		try {
			// `as never` here is the only remaining cast: drizzle-zod's discriminated union
			// over (blockType, content) doesn't narrow correlatively at the call site.
			const updatedBlock = await blockMutation.mutateAsync({
				blockType: currentBlock.blockType,
				content: currentBlock.content,
				id: currentBlock.id,
				resumeId,
			} as never);

			lastSavedRef.current = {
				...lastSavedRef.current,
				blocks: replaceBlockById(lastSavedRef.current.blocks, updatedBlock),
			};

			// Intentionally NOT calling form.setFieldValue('blocks[i]', updatedBlock).
			// Doing so would clobber any keystrokes that arrived during the in-flight save
			// (lost-update race). The form is the source of truth for the user's edits.
			updateCachedBlock(updatedBlock);
			return "saved" as const;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo guardar bloque");
			return "error" as const;
		}
	};

	const saveQueue = useAsyncQueuer(
		(job: SaveJob) => {
			if (job.kind === "title") {
				return persistTitle(job.title);
			}

			return persistBlock(job.blockId);
		},
		{
			concurrency: 1,
			onSettled: (_job, queuer) => {
				settleSaveStatus(
					(queuer.store.state.lastResult as SaveJobOutcome | null) ?? "skipped",
					queuer.store.state.activeItems.length + queuer.store.state.size
				);
			},
			onUnmount: () => {
				// Do NOT stop/abort the queuer here. React StrictMode dev fires this
				// cleanup after the first mount, but the SAME queuer instance is reused
				// on the second mount — stopping it would leave it permanently stopped.
				// React 19 silently ignores setState on unmounted components, so any
				// in-flight mutation that resolves after a real unmount is a no-op.
				clearBlockSaveDebouncers();
			},
		}
	);

	const saveTitle = () => {
		const current = getValues().title;
		const trimmed = current.trim();
		const previous = lastSavedRef.current.title.trim();

		if (!trimmed) {
			return;
		}

		if (trimmed !== current) {
			setTitle(trimmed);
		}

		if (trimmed === previous) {
			return;
		}

		enqueueSaveJob({ kind: "title", title: trimmed });
	};

	const getBlockSaveDebouncer = (blockId: number) => {
		pruneBlockSaveDebouncers(getValues().blocks);

		const existingDebouncer = blockSaveDebouncersRef.current.get(blockId);

		if (existingDebouncer) {
			return existingDebouncer;
		}

		const debouncer = new AsyncDebouncer(
			(nextBlockId: number) => {
				enqueueSaveJob({ blockId: nextBlockId, kind: "block" });
				return Promise.resolve();
			},
			{ wait: SAVE_DEBOUNCE_MS, key: "resume_form_debouncer" }
		);

		blockSaveDebouncersRef.current.set(blockId, debouncer);
		return debouncer;
	};

	const queueBlockSave = (blockId: number) => {
		getBlockSaveDebouncer(blockId)
			.maybeExecute(blockId)
			.catch(() => undefined);
	};

	const flushBlockSave = (blockId: number) => {
		const debouncer = getBlockSaveDebouncer(blockId);

		if (debouncer.store.state.isPending) {
			debouncer.flush().catch(() => undefined);
			return;
		}

		enqueueSaveJob({ blockId, kind: "block" });
	};

	const hydrateSaved = (values: ResumeDocumentWrapperForm) => {
		lastSavedRef.current = values;
		pruneBlockSaveDebouncers(values.blocks);
	};

	return { flushBlockSave, hydrateSaved, queueBlockSave, saveStatus, saveTitle };
}

export type ResumeAutosave = ReturnType<typeof useResumeAutosave>;

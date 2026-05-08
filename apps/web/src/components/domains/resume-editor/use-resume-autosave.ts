"use client";

import type { ResumeDocumentWrapperForm } from "@stackk-career/schemas/api/resumes";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

export type SaveStatus = "error" | "idle" | "saved" | "saving";

type ResumeBlock = ResumeDocumentWrapperForm["blocks"][number];

const SAVE_DEBOUNCE_MS = 800;
const SAVED_DISPLAY_MS = 1600;

const replaceBlockById = (blocks: ResumeBlock[], next: ResumeBlock) =>
	blocks.map((block) => (block.id === next.id ? next : block));

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
	const pendingSavesRef = useRef(0);
	const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const blockSaveTimeoutsRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
	const lastSavedRef = useRef<ResumeDocumentWrapperForm>(initialValues);
	const mountedRef = useRef(true);

	const titleMutation = useMutation(orpc.resumes.updateTitle.mutationOptions());
	const blockMutation = useMutation(orpc.blocks.update.mutationOptions());

	useEffect(
		() => () => {
			mountedRef.current = false;
			if (saveStatusTimeoutRef.current) {
				clearTimeout(saveStatusTimeoutRef.current);
			}
			for (const timeout of blockSaveTimeoutsRef.current.values()) {
				clearTimeout(timeout);
			}
			blockSaveTimeoutsRef.current.clear();
		},
		[]
	);

	const safeSetSaveStatus = (status: SaveStatus) => {
		if (mountedRef.current) {
			setSaveStatus(status);
		}
	};

	const beginSave = () => {
		if (saveStatusTimeoutRef.current) {
			clearTimeout(saveStatusTimeoutRef.current);
			saveStatusTimeoutRef.current = null;
		}
		pendingSavesRef.current += 1;
		safeSetSaveStatus("saving");
	};

	const finishSave = (status: Exclude<SaveStatus, "saving">) => {
		pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);

		if (status === "error") {
			safeSetSaveStatus("error");
			return;
		}

		if (pendingSavesRef.current > 0) {
			return;
		}

		safeSetSaveStatus("saved");
		saveStatusTimeoutRef.current = setTimeout(() => {
			safeSetSaveStatus("idle");
		}, SAVED_DISPLAY_MS);
	};

	const saveTitle = async () => {
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

		beginSave();

		try {
			const updatedResume = await titleMutation.mutateAsync({
				id: resumeId,
				title: trimmed,
			});

			lastSavedRef.current = {
				...lastSavedRef.current,
				title: updatedResume.title,
			};

			const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: resumeId } });
			queryClient.setQueryData(resumeQuery.queryKey, (previous_) =>
				previous_ ? { ...previous_, title: updatedResume.title, updatedAt: updatedResume.updatedAt } : previous_
			);
			updateListResumeTitle(updatedResume.id, updatedResume.title, updatedResume.updatedAt);
			finishSave("saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo guardar el título");
			finishSave("error");
		}
	};

	const saveBlock = async (blockId: number) => {
		const currentBlock = getValues().blocks.find((block) => block.id === blockId);

		if (!currentBlock) {
			return;
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
			const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: resumeId } });
			queryClient.setQueryData(resumeQuery.queryKey, (previous) =>
				previous
					? {
							...previous,
							blocks: replaceBlockById(previous.blocks as ResumeBlock[], updatedBlock),
						}
					: previous
			);
			finishSave("saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo guardar bloque");
			finishSave("error");
		}
	};

	const queueBlockSave = (blockId: number) => {
		const previous = blockSaveTimeoutsRef.current.get(blockId);

		if (previous) {
			clearTimeout(previous);
		}

		const timeout = setTimeout(() => {
			blockSaveTimeoutsRef.current.delete(blockId);
			saveBlock(blockId).catch(() => undefined);
		}, SAVE_DEBOUNCE_MS);

		blockSaveTimeoutsRef.current.set(blockId, timeout);
	};

	const flushBlockSave = (blockId: number) => {
		const timeout = blockSaveTimeoutsRef.current.get(blockId);

		if (timeout) {
			clearTimeout(timeout);
			blockSaveTimeoutsRef.current.delete(blockId);
		}

		saveBlock(blockId).catch(() => undefined);
	};

	const hydrateSaved = (values: ResumeDocumentWrapperForm) => {
		lastSavedRef.current = values;
	};

	return { flushBlockSave, hydrateSaved, queueBlockSave, saveStatus, saveTitle };
}

export type ResumeAutosave = ReturnType<typeof useResumeAutosave>;

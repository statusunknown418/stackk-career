"use client";

import { type ResumeDocumentWrapperForm, resumeDocumentWrapperFormSchema } from "@stackk-career/schemas/api/resumes";
import type { Block } from "@stackk-career/schemas/db/resume-blocks";
import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import type { SaveStatus } from "@/components/domains/resume-editor/use-resume-autosave";

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
	fieldComponents: {},
	fieldContext,
	formComponents: {},
	formContext,
});

// Narrow structural alias of the methods we mutate from outside the form
// owner. TanStack Form's concrete API exposes a much wider field-name union;
// listing only the paths we actually write keeps consumers decoupled from the
// deep generics while remaining assignable from the real form (parameters are
// contravariant — a wider source union can satisfy this narrower target).
export interface ResumeFormApi {
	pushFieldValue(field: "blocks", value: ResumeDocumentWrapperForm["blocks"][number]): void;
	removeFieldValue(field: "blocks", index: number): Promise<void> | void;
	setFieldValue(
		field:
			| "blocks"
			| `blocks[${number}].id`
			| `blocks[${number}].position`
			| `blocks[${number}].createdAt`
			| `blocks[${number}].updatedAt`
			| `blocks[${number}].parentBlockId`,
		value: unknown
	): void;
	state: { values: ResumeDocumentWrapperForm };
}

export const resumeFormDefaults: ResumeDocumentWrapperForm = {
	blocks: [],
	id: "",
	title: "",
};

/**
 * `withForm` requires every entry in `props` to have a runtime default so that TS can
 * infer the component's prop types. Editors don't have natural defaults for things like
 * `BlockNode` or `Map<number, number>`, so we use this helper instead of writing
 * `undefined as unknown as T` at every call site.
 */
export const propType = <T,>(): T => undefined as unknown as T;

export const SAVE_STATUS_LABELS: Record<SaveStatus, string | null> = {
	error: "Error",
	idle: null,
	saved: "Saved",
	saving: "Saving",
};

export const buildDocumentFormValues = (data: {
	blocks: unknown[];
	id: string;
	title: string;
}): ResumeDocumentWrapperForm =>
	resumeDocumentWrapperFormSchema.parse({
		id: data.id,
		title: data.title,
		blocks: data.blocks,
	});

// Hydration key is intentionally shape-only (id + parent + position). Content
// updates (title, block content, updatedAt) flow into the cache via our own
// mutations and must NOT trigger a `form.reset` — that would clobber any
// keystrokes that arrived between request dispatch and response. Add/remove/
// reorder operations DO change the shape and rightly cause a reset so the form
// picks up the new field paths.
export const buildHydrationKey = (data: {
	blocks: { id: number; parentBlockId: number | null; position: string }[];
	id: string;
}) => [data.id, ...data.blocks.map((block) => `${block.id}:${block.parentBlockId ?? ""}:${block.position}`)].join("|");

export const BLOCK_FIELD_PATH_RE = /^blocks\[(\d+)\]/;

type FormBlock = ResumeDocumentWrapperForm["blocks"][number];

export const removeMissingBlocks = (form: ResumeFormApi, keepIds: Set<number>) => {
	const formBlocks = form.state.values.blocks;
	const survivors = formBlocks.filter((formBlock) => keepIds.has(formBlock.id));
	if (survivors.length !== formBlocks.length) {
		form.setFieldValue("blocks", survivors);
	}
};

export const patchSurvivorBlockMetadata = (form: ResumeFormApi, nextById: Map<number, FormBlock>): Set<number> => {
	const survivors = form.state.values.blocks;
	const survivorIds = new Set<number>();
	for (let index = 0; index < survivors.length; index++) {
		const formBlock = survivors[index];
		if (!formBlock) {
			continue;
		}
		survivorIds.add(formBlock.id);
		const next = nextById.get(formBlock.id);
		if (!next) {
			continue;
		}
		if (next.position !== formBlock.position) {
			form.setFieldValue(`blocks[${index}].position`, next.position);
		}
		if ((next.parentBlockId ?? null) !== (formBlock.parentBlockId ?? null)) {
			form.setFieldValue(`blocks[${index}].parentBlockId`, next.parentBlockId);
		}
		if ((next as Block).updatedAt !== formBlock.updatedAt) {
			form.setFieldValue(`blocks[${index}].updatedAt`, next.updatedAt);
		}
	}
	return survivorIds;
};

export const reconcileBlocks = (form: ResumeFormApi, nextBlocks: FormBlock[]) => {
	const nextById = new Map<number, FormBlock>(nextBlocks.map((block) => [block.id, block]));
	const keepIds = new Set<number>(nextBlocks.map((block) => block.id));
	removeMissingBlocks(form, keepIds);
	const survivorIds = patchSurvivorBlockMetadata(form, nextById);
	for (const next of nextBlocks) {
		if (!survivorIds.has(next.id)) {
			form.pushFieldValue("blocks", next);
		}
	}
};

export const blockIdFromFieldName = (name: string, values: ResumeDocumentWrapperForm): number | null => {
	const match = BLOCK_FIELD_PATH_RE.exec(name);
	if (!match) {
		return null;
	}
	const block = values.blocks[Number(match[1])];
	return block?.id ?? null;
};

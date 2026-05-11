"use client";

import type { ResumeDocumentWrapperForm } from "@stackk-career/schemas/api/resumes";
import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { CheckboxField } from "@/components/domains/resume-editor/fields/checkbox-field";
import { MonthField } from "@/components/domains/resume-editor/fields/month-field";
import { SelectField } from "@/components/domains/resume-editor/fields/select-field";
import { TextField } from "@/components/domains/resume-editor/fields/text-field";

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
	fieldComponents: {
		CheckboxField,
		MonthField,
		SelectField,
		TextField,
	},
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

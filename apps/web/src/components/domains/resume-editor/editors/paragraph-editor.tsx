"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { RichTextField } from "../fields/rich-text-field";
import type { ResumeAutosave } from "../use-resume-autosave";

type ParagraphBlock = Extract<BlockNode, { blockType: "paragraph" }>;

export const ParagraphEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		autosave: propType<ResumeAutosave>(),
		block: propType<ParagraphBlock>(),
		blockIndex: 0,
		placeholder: "Añade contexto adicional",
		toolbar: propType<"prose" | "short">(),
	},
	render: ({ form, autosave, block, blockIndex, placeholder, toolbar }) => (
		<form.AppField
			listeners={{
				onBlur: () => autosave.flushBlockSave(block.id),
				onChange: () => autosave.queueBlockSave(block.id),
			}}
			name={`blocks[${blockIndex}].content.text` as const}
		>
			{(textField) => (
				<form.AppField name={`blocks[${blockIndex}].content.format` as const}>
					{(formatField) => (
						<RichTextField
							blockId={block.id}
							formatField={formatField}
							placeholder={placeholder}
							textField={textField}
							toolbar={toolbar}
						/>
					)}
				</form.AppField>
			)}
		</form.AppField>
	),
});

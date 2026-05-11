"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { RichTextField } from "../fields/rich-text-field";

type BulletBlock = Extract<BlockNode, { blockType: "bullet" }>;

export const BulletEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<BulletBlock>(),
		blockIndex: 0,
	},
	render: ({ form, block, blockIndex }) => (
		<li className="pl-1">
			<form.AppField name={`blocks[${blockIndex}].content.text` as const}>
				{(textField) => (
					<form.AppField name={`blocks[${blockIndex}].content.format` as const}>
						{(formatField) => (
							<RichTextField
								blockId={block.id}
								formatField={formatField}
								placeholder="Describe impacto o logro"
								textField={textField}
								toolbar="short"
							/>
						)}
					</form.AppField>
				)}
			</form.AppField>
		</li>
	),
});

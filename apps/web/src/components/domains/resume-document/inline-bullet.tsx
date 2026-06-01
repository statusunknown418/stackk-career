"use client";

import { proseContentToHtml } from "@stackk-career/schemas/db/resume-blocks";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { InlineTextEditor } from "./inline-text-editor";

interface InlineBulletCallbacks {
	onEnterEmpty?: () => void;
}

export const InlineBullet = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		blockIndex: 0,
		onEnterEmpty: propType<InlineBulletCallbacks["onEnterEmpty"]>(),
	},
	render: ({ form, blockIndex, onEnterEmpty }) => {
		const blockId = form.state.values.blocks[blockIndex]?.id as number | undefined;
		return (
			<li className="pl-1" data-block-id={blockId}>
				<form.AppField name={`blocks[${blockIndex}].content.text` as const}>
					{(textField) => (
						<form.AppField name={`blocks[${blockIndex}].content.format` as const}>
							{(formatField) => {
								const textValue = (textField.state.value ?? "") as string;
								const formatValue = (formatField.state.value ?? "html") as "html" | "plain";
								const html = proseContentToHtml(textValue, formatValue);
								return (
									<InlineTextEditor
										onBlur={() => textField.handleBlur()}
										onChange={(value) => {
											textField.handleChange(value);
											if (formatValue !== "html") {
												formatField.handleChange("html");
											}
										}}
										onEnterEmpty={onEnterEmpty}
										placeholder="Describe impacto o logro"
										value={html}
										variant="prose"
									/>
								);
							}}
						</form.AppField>
					)}
				</form.AppField>
			</li>
		);
	},
});

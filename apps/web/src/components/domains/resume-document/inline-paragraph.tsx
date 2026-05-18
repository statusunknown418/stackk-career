"use client";

import { proseContentToHtml } from "@stackk-career/schemas/db/resume-blocks";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { InlineTextEditor } from "./inline-text-editor";

export const InlineParagraph = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		blockIndex: 0,
		placeholder: propType<string | undefined>(),
	},
	render: ({ form, blockIndex, placeholder }) => {
		const params = Route.useParams();
		return (
			<form.AppField name={`blocks[${blockIndex}].content.text` as const}>
				{(textField) => (
					<form.AppField name={`blocks[${blockIndex}].content.format` as const}>
						{(formatField) => {
							const textValue = (textField.state.value ?? "") as string;
							const formatValue = (formatField.state.value ?? "html") as "html" | "plain";
							const html = proseContentToHtml(textValue, formatValue);
							const blockId = form.state.values.blocks[blockIndex]?.id as number | undefined;
							const handleApply = (nextHtml: string) => {
								textField.handleChange(nextHtml);
								if (formatValue !== "html") {
									formatField.handleChange("html");
								}
							};
							return (
								<InlineTextEditor
									onBlur={() => textField.handleBlur()}
									onChange={(value) => {
										textField.handleChange(value);
										if (formatValue !== "html") {
											formatField.handleChange("html");
										}
									}}
									placeholder={placeholder}
									suggestion={{
										input: {
											resumeId: params.resumeId,
											blockId,
											blockType: "paragraph",
											field: "text",
											existingContent: html,
										},
										onApply: handleApply,
									}}
									value={html}
									variant="prose"
								/>
							);
						}}
					</form.AppField>
				)}
			</form.AppField>
		);
	},
});

"use client";

import { proseContentToHtml } from "@stackk-career/schemas/db/resume-blocks";
import type { AnyFieldApi } from "@tanstack/react-form";
import { ResumeRichTextField } from "../resume-rich-text-field";

interface RichTextFieldProps {
	blockId: number;
	formatField: AnyFieldApi;
	placeholder?: string;
	textField: AnyFieldApi;
	toolbar?: "prose" | "short";
}

export function RichTextField({ blockId, formatField, placeholder, textField, toolbar }: RichTextFieldProps) {
	const textValue = (textField.state.value ?? "") as string;
	const formatValue = (formatField.state.value ?? "html") as "html" | "plain";

	return (
		<ResumeRichTextField
			editorKey={`block-${blockId}`}
			onBlur={() => textField.handleBlur()}
			onChange={(value) => {
				textField.handleChange(value);
				if (formatValue !== "html") {
					formatField.handleChange("html");
				}
			}}
			placeholder={placeholder}
			toolbar={toolbar}
			value={proseContentToHtml(textValue, formatValue)}
		/>
	);
}

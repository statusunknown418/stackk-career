"use client";

import { lazy, Suspense } from "react";

const ResumeRichTextEditor = lazy(async () => {
	const module = await import("./resume-rich-text-editor");

	return {
		default: module.ResumeRichTextEditor,
	};
});

interface ResumeRichTextFieldProps {
	editorKey?: string;
	onBlur?: () => void;
	onChange?: (value: string) => void;
	placeholder?: string;
	readOnly?: boolean;
	toolbar?: "prose" | "short";
	value: string;
}

export const ResumeRichTextField = ({
	editorKey,
	onBlur,
	onChange,
	placeholder,
	readOnly = false,
	toolbar = "prose",
	value,
}: ResumeRichTextFieldProps) => (
	<Suspense
		fallback={
			<div className="px-2 py-1.5">
				<p className="text-base text-muted-foreground leading-relaxed">{placeholder}</p>
			</div>
		}
	>
		<ResumeRichTextEditor
			key={editorKey}
			onBlur={onBlur}
			onChange={onChange}
			placeholder={placeholder}
			readOnly={readOnly}
			toolbar={toolbar}
			value={value}
		/>
	</Suspense>
);

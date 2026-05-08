"use client";

import { lazy, Suspense } from "react";

const ResumeRichTextEditor = lazy(async () => {
	const module = await import("./resume-rich-text-editor");

	return {
		default: module.ResumeRichTextEditor,
	};
});

interface ResumeRichTextFieldProps {
	initialContent: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	readOnly?: boolean;
}

export const ResumeRichTextField = ({
	initialContent,
	onChange,
	placeholder,
	readOnly = false,
}: ResumeRichTextFieldProps) => (
	<Suspense
		fallback={
			<div className="px-2 py-1.5">
				<p className="text-base text-muted-foreground leading-relaxed">{placeholder}</p>
			</div>
		}
	>
		<ResumeRichTextEditor
			initialContent={initialContent}
			onChange={onChange}
			placeholder={placeholder}
			readOnly={readOnly}
		/>
	</Suspense>
);

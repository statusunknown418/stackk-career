import type { ModelMessage } from "ai";

/**
 * Build a single user message containing N text parts followed by the resume PDF attachment.
 * Used by every resume-related agent (parser + analysis) to keep the file payload identical.
 */
export const pdfUserMessage = (pdfUrl: string, ...textParts: string[]): ModelMessage => ({
	role: "user",
	content: [
		...textParts.map((text) => ({ type: "text" as const, text })),
		{
			type: "file" as const,
			data: new URL(pdfUrl),
			mediaType: "application/pdf" as const,
			filename: "resume.pdf",
		},
	],
});

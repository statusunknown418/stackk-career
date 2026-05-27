import type { ModelMessage } from "ai";

interface PdfUserMessageOptions {
	/**
	 * When true, attaches Anthropic `cache_control: ephemeral` to the PDF file
	 * part so the provider caches the (system + PDF) prefix for ~5 minutes.
	 * Reuses the cached prefix across subsequent calls in the same agent run,
	 * cutting input-token cost by ~90% on cache hits. Safe to set for non-Anthropic
	 * providers (the option is namespaced under `providerOptions.anthropic`).
	 */
	cachePdf?: boolean;
}

/**
 * Build a single user message containing N text parts followed by the resume PDF attachment.
 * Used by every resume-related agent (parser + analysis) to keep the file payload identical.
 *
 * Takes raw PDF bytes — passing a URL via the file part breaks on Anthropic
 * (the provider tries to wrap it as image base64 and rejects the URL string).
 * Bytes work across every provider.
 */
export const pdfUserMessage = (
	pdfData: Uint8Array,
	textParts: string[],
	options: PdfUserMessageOptions = {}
): ModelMessage => ({
	role: "user",
	content: [
		...textParts.map((text) => ({ type: "text" as const, text })),
		{
			type: "file" as const,
			data: pdfData,
			mediaType: "application/pdf" as const,
			filename: "resume.pdf",
			...(options.cachePdf
				? {
						providerOptions: {
							anthropic: { cacheControl: { type: "ephemeral" as const } },
						},
					}
				: {}),
		},
	],
});

export async function fetchPdfBytes(pdfUrl: string, signal?: AbortSignal): Promise<Uint8Array> {
	const response = await fetch(pdfUrl, { signal });
	if (!response.ok) {
		throw new Error(`Failed to fetch PDF (${response.status}): ${pdfUrl}`);
	}
	return new Uint8Array(await response.arrayBuffer());
}

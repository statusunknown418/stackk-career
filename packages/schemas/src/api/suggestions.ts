import { z } from "zod";

export const suggestResumeBlockInputSchema = z.object({
	resumeId: z.string(),
	blockId: z.number().int().positive().optional(),
	blockType: z.enum(["paragraph", "entry"]),
	field: z.enum(["text", "descriptor"]),
	existingContent: z.string().optional(),
});

export const suggestionItemSchema = z.object({
	label: z.string().max(40),
	html: z.string().max(2000),
});

export const suggestResumeBlockOutputSchema = z.object({
	suggestions: z.array(suggestionItemSchema),
});

export const prepareSuggestionOutputSchema = z.object({
	system: z.string(),
	prompt: z.string(),
	generationId: z.string(),
	userMessageId: z.string().nullable(),
	model: z.string(),
	userId: z.string(),
});

export const tokenUsageSchema = z
	.object({
		inputTokens: z.number().optional(),
		outputTokens: z.number().optional(),
		totalTokens: z.number().optional(),
		reasoningTokens: z.number().optional(),
		cachedInputTokens: z.number().optional(),
	})
	.partial();

export const recordSuggestionCompletionInputSchema = z.object({
	generationId: z.string(),
	suggestions: z.array(suggestionItemSchema),
	usage: tokenUsageSchema.optional(),
	finishReason: z.string(),
});

export const recordSuggestionErrorInputSchema = z.object({
	generationId: z.string(),
	errorMessage: z.string(),
});

export type SuggestResumeBlockInput = z.infer<typeof suggestResumeBlockInputSchema>;
export type SuggestResumeBlockOutput = z.infer<typeof suggestResumeBlockOutputSchema>;
export type SuggestionItem = z.infer<typeof suggestionItemSchema>;
export type PrepareSuggestionOutput = z.infer<typeof prepareSuggestionOutputSchema>;
export type RecordSuggestionCompletionInput = z.infer<typeof recordSuggestionCompletionInputSchema>;
export type RecordSuggestionErrorInput = z.infer<typeof recordSuggestionErrorInputSchema>;

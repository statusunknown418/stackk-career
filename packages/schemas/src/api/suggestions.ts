import { z } from "zod";

export const suggestResumeBlockInputSchema = z.object({
	resumeId: z.string(),
	blockId: z.number().int().positive().optional(),
	blockType: z.enum(["paragraph", "entry"]),
	field: z.enum(["text", "descriptor"]),
	existingContent: z.string().optional(),
});

export const suggestionItemSchema = z.object({
	html: z.string().max(2000),
});

export const suggestResumeBlockOutputSchema = z.object({
	suggestions: z.array(suggestionItemSchema),
});

export type SuggestResumeBlockInput = z.infer<typeof suggestResumeBlockInputSchema>;
export type SuggestResumeBlockOutput = z.infer<typeof suggestResumeBlockOutputSchema>;
export type SuggestionItem = z.infer<typeof suggestionItemSchema>;

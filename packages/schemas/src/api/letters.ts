import { z } from "zod";

/**
 * Input for the dialog at /letters: pick the target job position and which CV to link.
 * The API creates a `generation` of type "cover-letter" with the linked resumeId
 * and returns its id, which becomes /letters/:generationId.
 */
export const createCoverLetterGenerationInputSchema = z.object({
	jobPosition: z.string().trim().min(1).max(500),
	resumeId: z.string().nonempty(),
});
export type CreateCoverLetterGenerationInput = z.infer<typeof createCoverLetterGenerationInputSchema>;

/**
 * Input for triggering the CASEY-Letters task from the chat at /letters/:generationId.
 * The task reads jobPosition + resumeId from the generation itself; only the
 * user's free-form extra prompt is forwarded per turn.
 */
export const triggerCoverLetterInputSchema = z.object({
	generationId: z.string().nonempty(),
	extraPrompt: z.string().max(2000).optional(),
});
export type TriggerCoverLetterInput = z.infer<typeof triggerCoverLetterInputSchema>;

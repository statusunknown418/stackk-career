import { z } from "zod";

/**
 * Input for the "casey-letters" Trigger.dev task.
 *
 * Fired by the letters API when the user submits a message in the
 * /letters/:generationId chat. The task runs streamText with tools
 * (getUserMetadata, getSelectedResume, generateArtifact) and streams
 * the resulting CoverLetter artifact to the frontend via realtime.
 */
export const caseyLettersInputSchema = z.object({
	messageId: z.string(),
	generationId: z.string(),
	userId: z.string(),
	resumeId: z.string(),
	jobPosition: z.string().min(1).max(500),
	extraPrompt: z.string().max(2000).optional(),
});

export type CaseyLettersInput = z.infer<typeof caseyLettersInputSchema>;

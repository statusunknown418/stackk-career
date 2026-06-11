import { z } from "zod";
import { coverLetterLanguageSchema } from "../api/letters";

/**
 * Input for the "casey-letters" Trigger.dev task.
 *
 * Fired by the letters API when the user submits a message in the
 * /letters/:generationId chat. The task runs streamText with tools
 * (getUserMetadata, getSelectedResume) and emits the CoverLetter via
 * `Output.object`, streaming partial chunks to the frontend.
 *
 * `language` comes from the `generations.language` column (es/en); the agent
 * builds the system prompt + few-shot block from that flag.
 */
export const caseyLettersInputSchema = z.object({
	messageId: z.string(),
	generationId: z.string(),
	userId: z.string(),
	resumeId: z.string(),
	jobPosition: z.string().min(1).max(500),
	jobDescription: z.string().max(5000).optional(),
	language: coverLetterLanguageSchema.default("es"),
	extraPrompt: z.string().max(2000).optional(),
});

export type CaseyLettersInput = z.infer<typeof caseyLettersInputSchema>;

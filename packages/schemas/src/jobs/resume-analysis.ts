import { z } from "zod";

export const resumeAgentInputSchema = z.object({
	generationId: z.string(),
	userId: z.string(),
});

export type ResumeAgentInput = z.infer<typeof resumeAgentInputSchema>;

import { z } from "zod";

export const createGenerationInputSchema = z.object({
	title: z.string().nullable(),
	summary: z.string().nullable(),
});

export const getGenerationInputSchema = z.object({ id: z.string().nonempty() });

export const getResumeAnalysisInputSchema = z.object({ generationId: z.string().nonempty() });

export type CreateGenerationInput = z.infer<typeof createGenerationInputSchema>;
export type GetGenerationInput = z.infer<typeof getGenerationInputSchema>;
export type GetResumeAnalysisInput = z.infer<typeof getResumeAnalysisInputSchema>;

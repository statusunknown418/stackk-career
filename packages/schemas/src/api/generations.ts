import type { z } from "zod";
import { insertGenerationSchema, selectGenerationSchema } from "../db/generations";
import { selectResumeAnalysisSchema } from "../db/resume-analyses";

export const createGenerationInputSchema = insertGenerationSchema
	.pick({
		summary: true,
		title: true,
	})
	.required({
		summary: true,
		title: true,
	});

export const getGenerationInputSchema = selectGenerationSchema.pick({ id: true });
export const getResumeAnalysisInputSchema = selectResumeAnalysisSchema.pick({ generationId: true });

export type CreateGenerationInput = z.infer<typeof createGenerationInputSchema>;
export type GetGenerationInput = z.infer<typeof getGenerationInputSchema>;
export type GetResumeAnalysisInput = z.infer<typeof getResumeAnalysisInputSchema>;

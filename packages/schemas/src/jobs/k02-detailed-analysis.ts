import { z } from "zod";

export const k02DetailedAnalysisInputSchema = z.object({
	analysisId: z.string(),
	generationId: z.string(),
	resumeId: z.string(),
	userId: z.string(),
	parentAnalysisId: z.string().optional(),
});

export type K02DetailedAnalysisInput = z.infer<typeof k02DetailedAnalysisInputSchema>;

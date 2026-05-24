import { z } from "zod";

export const k02DetailedAnalysisInputSchema = z.object({
	analysisId: z.string(),
	generationId: z.string(),
	resumeId: z.string(),
	userId: z.string(),
});

export type K02DetailedAnalysisInput = z.infer<typeof k02DetailedAnalysisInputSchema>;

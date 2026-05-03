import { z } from "zod";

export const k02FastAnalysisInputSchema = z.object({
	analysisId: z.string(),
	generationId: z.string(),
	userId: z.string(),
	pdfUrl: z.url(),
});

export type K02FastAnalysisInput = z.infer<typeof k02FastAnalysisInputSchema>;

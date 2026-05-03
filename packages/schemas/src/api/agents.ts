import { z } from "zod";

export const initiateResumeAnalysisInputSchema = z.object({
	generationId: z.string().nonempty(),
	parentAnalysisId: z.string().optional(),
});
export type InitiateResumeAnalysisInput = z.infer<typeof initiateResumeAnalysisInputSchema>;

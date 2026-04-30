import { z } from "zod";

export const initiateResumeAnalysisInputSchema = z.object({ generationId: z.string().nonempty() });
export type InitiateResumeAnalysisInput = z.infer<typeof initiateResumeAnalysisInputSchema>;

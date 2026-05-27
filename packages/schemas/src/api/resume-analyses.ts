import { z } from "zod";

export const setResumeAnalysisEditAppliedInputSchema = z.object({
	analysisId: z.string().nonempty(),
	editIndex: z.number().int().min(0),
	applied: z.boolean(),
});
export type SetResumeAnalysisEditAppliedInput = z.infer<typeof setResumeAnalysisEditAppliedInputSchema>;

export const setResumeAnalysisEditDismissedInputSchema = z.object({
	analysisId: z.string().nonempty(),
	editIndex: z.number().int().min(0),
	dismissed: z.boolean(),
});
export type SetResumeAnalysisEditDismissedInput = z.infer<typeof setResumeAnalysisEditDismissedInputSchema>;

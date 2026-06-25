import { z } from "zod";

export const setResumeAnalysisEditDismissedInputSchema = z.object({
	analysisId: z.string().nonempty(),
	editId: z.string().nonempty(),
	dismissed: z.boolean(),
});
export type SetResumeAnalysisEditDismissedInput = z.infer<typeof setResumeAnalysisEditDismissedInputSchema>;

export const applyResumeAnalysisEditInputSchema = z.object({
	analysisId: z.string().nonempty(),
	editId: z.string().nonempty(),
});
export type ApplyResumeAnalysisEditInput = z.infer<typeof applyResumeAnalysisEditInputSchema>;

export const applyAllResumeAnalysisEditsInputSchema = z.object({
	analysisId: z.string().nonempty(),
});
export type ApplyAllResumeAnalysisEditsInput = z.infer<typeof applyAllResumeAnalysisEditsInputSchema>;

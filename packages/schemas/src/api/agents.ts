import { z } from "zod";

export const triggerResumeAnalysisInputSchema = z.object({
	generationId: z.string().nonempty(),
	parentAnalysisId: z.string().optional(),
});
export type InitiateResumeAnalysisInput = z.infer<typeof triggerResumeAnalysisInputSchema>;

export const triggerResumeParserInputSchema = z
	.object({
		fileId: z.string().optional(),
		fileUrl: z.url().optional(),
		displayName: z.string().optional(),
	})
	.refine((value) => Boolean(value.fileId) !== Boolean(value.fileUrl), {
		message: "Provide exactly one of fileId or fileUrl",
	});
export type InitiateResumeParserInput = z.infer<typeof triggerResumeParserInputSchema>;

import { z } from "zod";
import { editCategoryEnum, editSeverityEnum, resumeAnalysisSchema } from "../ai/resume-analysis";
import { insertGenerationSchema, selectGenerationSchema } from "../db/generations";
import { selectResumeAnalysisSchema } from "../db/resume-analyses";

export const createGenerationInputSchema = insertGenerationSchema.required({
	summary: true,
	title: true,
});

export const listGenerationsInputSchema = z
	.object({
		limit: z.number().int().min(1).max(200).optional().default(50),
		offset: z.number().int().min(0).optional().default(0),
	})
	.optional()
	.default({ limit: 50, offset: 0 });

export const getGenerationInputSchema = selectGenerationSchema.pick({ id: true });
export const getResumeAnalysisInputSchema = selectResumeAnalysisSchema.pick({ generationId: true });
export const getResumeAnalysisHistoryInputSchema = getResumeAnalysisInputSchema;

export const resumeAnalysisScoreDeltaSchema = z.object({
	delta: z.number().int(),
	from: z.number().int().min(0).max(100),
	to: z.number().int().min(0).max(100),
});
export const resumeEditSummarySchema = z.object({
	category: editCategoryEnum,
	delta: z.number().int().min(1).max(20),
	severity: editSeverityEnum,
	title: z.string().min(1),
});
export const resumeEditDiffSchema = z.object({
	added: z.array(resumeEditSummarySchema),
	removed: z.array(resumeEditSummarySchema),
	unchanged: z.array(resumeEditSummarySchema),
});
export const resumeAnalysisHistoryDiffSchema = z.object({
	baselineAnalysisId: z.string().nullable(),
	edits: resumeEditDiffSchema.nullable(),
	scoreBreakdown: z.record(editCategoryEnum, resumeAnalysisScoreDeltaSchema).nullable(),
	scoreOverall: resumeAnalysisScoreDeltaSchema.nullable(),
});
export const resumeAnalysisHistoryItemSchema = selectResumeAnalysisSchema
	.pick({
		createdAt: true,
		error: true,
		generationId: true,
		id: true,
		model: true,
		parentAnalysisId: true,
		resumeId: true,
		status: true,
		updatedAt: true,
	})
	.extend({
		analysis: resumeAnalysisSchema.nullable(),
		diff: resumeAnalysisHistoryDiffSchema,
	});
export const resumeAnalysisHistorySchema = z.array(resumeAnalysisHistoryItemSchema);

export type CreateGenerationInput = z.infer<typeof createGenerationInputSchema>;
export type ListGenerationsInput = z.infer<typeof listGenerationsInputSchema>;
export type GetGenerationInput = z.infer<typeof getGenerationInputSchema>;
export type GetResumeAnalysisInput = z.infer<typeof getResumeAnalysisInputSchema>;
export type GetResumeAnalysisHistoryInput = z.infer<typeof getResumeAnalysisHistoryInputSchema>;
export type ResumeAnalysisHistory = z.infer<typeof resumeAnalysisHistorySchema>;
export type ResumeAnalysisHistoryDiff = z.infer<typeof resumeAnalysisHistoryDiffSchema>;
export type ResumeAnalysisHistoryItem = z.infer<typeof resumeAnalysisHistoryItemSchema>;
export type ResumeAnalysisScoreDelta = z.infer<typeof resumeAnalysisScoreDeltaSchema>;
export type ResumeEditDiff = z.infer<typeof resumeEditDiffSchema>;
export type ResumeEditSummary = z.infer<typeof resumeEditSummarySchema>;

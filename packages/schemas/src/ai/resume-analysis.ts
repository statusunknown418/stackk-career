import { z } from "zod";

export const editCategoryEnum = z.enum(["impact", "keywords", "clarity", "formatting", "length"]);
export type EditCategory = z.infer<typeof editCategoryEnum>;

export const editSeverityEnum = z.enum(["top-win", "missing", "soft-signal"]);
export type EditSeverity = z.infer<typeof editSeverityEnum>;

export const editActionEnum = z.enum(["rewrite", "delete"]);
export type EditAction = z.infer<typeof editActionEnum>;

const scoreField = z.number().int().min(0).max(100);
export const resumeAnalysisScoreBreakdownKeys = ["impact", "keywords", "clarity", "formatting", "length"] as const;

export const resumeAnalysisSchema = z.object({
	scoreOverall: scoreField,
	scoreBreakdown: z.object({
		impact: scoreField,
		keywords: scoreField,
		clarity: scoreField,
		formatting: scoreField,
		length: scoreField,
	}),
	edits: z
		.array(
			z.object({
				delta: z.number().int().min(1).max(20),
				category: editCategoryEnum,
				severity: editSeverityEnum,
				title: z.string().min(1),
				description: z.string().min(1),
				targetBlockId: z.number().int().positive().nullable().optional(),
				action: editActionEnum.optional(),
				before: z.string().optional(),
				after: z.string().optional(),
			})
		)
		.max(5),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type ResumeAnalysisObject = ResumeAnalysis;
export type ResumeEdit = ResumeAnalysis["edits"][number];

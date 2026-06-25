import { z } from "zod";

export const editCategoryEnum = z.enum(["impact", "keywords", "clarity", "formatting", "length"]);
export type EditCategory = z.infer<typeof editCategoryEnum>;

export const editSeverityEnum = z.enum(["top-win", "missing", "soft-signal"]);
export type EditSeverity = z.infer<typeof editSeverityEnum>;

export const editActionEnum = z.enum(["rewrite", "delete"]);
export type EditAction = z.infer<typeof editActionEnum>;

export const resumeAnalysisScoreBreakdownKeys = ["impact", "keywords", "clarity", "formatting", "length"] as const;

export const scoreField = z
	.number()
	.int()
	.min(0)
	.max(100)
	.describe("Integer score from 0 to 100. NEVER a decimal. Round to nearest whole number before emitting.");

export const scoreBreakdownSchema = z.object({
	impact: scoreField,
	keywords: scoreField,
	clarity: scoreField,
	formatting: scoreField,
	length: scoreField,
});
export type ResumeAnalysisScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

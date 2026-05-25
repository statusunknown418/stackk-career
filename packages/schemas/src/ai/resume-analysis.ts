import { z } from "zod";

export const editCategoryEnum = z.enum(["impact", "keywords", "clarity", "formatting", "length"]);
export type EditCategory = z.infer<typeof editCategoryEnum>;

export const editSeverityEnum = z.enum(["top-win", "missing", "soft-signal"]);
export type EditSeverity = z.infer<typeof editSeverityEnum>;

export const editActionEnum = z.enum(["rewrite", "delete"]);
export type EditAction = z.infer<typeof editActionEnum>;

const scoreField = z
	.number()
	.int()
	.min(0)
	.max(100)
	.describe("Integer score from 0 to 100. NEVER a decimal. Round to nearest whole number before emitting.");
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
				targetBlockId: z
					.number()
					.int()
					.positive()
					.nullable()
					.describe(
						'The exact "id" of the targeted resume block (read from the input JSON tree). REQUIRED (non-null) when action is "rewrite" or "delete". Null ONLY for resume-wide informational advice with no concrete mutation (e.g. "add a LinkedIn URL"). Prefer the most granular block possible (a bullet\'s id over its parent entry).'
					)
					.optional(),
				action: editActionEnum
					.describe(
						'How the edit mutates the targeted block. "rewrite" REQUIRES "targetBlockId" AND both "before" AND "after" non-empty. "delete" REQUIRES "targetBlockId" and FORBIDS "before"/"after" (never delete the contact block). OMIT entirely for purely informational / resume-wide advice. NEVER set action="rewrite" with only "before" and no "after" — that emits a broken suggestion the UI cannot apply.'
					)
					.optional(),
				before: z
					.string()
					.min(1)
					.describe(
						'REQUIRED when action="rewrite". The EXACT substring currently present in the targeted block (verbatim — punctuation, casing, and HTML tags preserved). Pulled from one of the block\'s text fields (bullet.text, paragraph.text, entry.descriptor, entry.title, etc.). Omit entirely when action is "delete" or absent.'
					)
					.optional(),
				after: z
					.string()
					.min(1)
					.describe(
						'REQUIRED when action="rewrite" and "before" is set. The improved replacement text that will literally replace "before" in the resume. MUST be a complete, usable replacement — NEVER a placeholder like "X%", "Y%", "Z", "[number]", "[metric]", or a description of what to write. If you cannot supply a concrete replacement (e.g. the resume contains a placeholder like "X%" and you have no real metric to substitute), DO NOT set action="rewrite" — omit "action", "before", AND "after" entirely and keep the suggestion informational via "description". NEVER emit "before" without "after".'
					)
					.optional(),
			})
		)
		.max(5),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type ResumeAnalysisObject = ResumeAnalysis;
export type ResumeEdit = ResumeAnalysis["edits"][number];
export type ResumeAnalysisScoreBreakdown = ResumeAnalysis["scoreBreakdown"];

export const priorEditStatusEnum = z.enum(["applied", "dismissed", "pending"]);
export type PriorEditStatus = z.infer<typeof priorEditStatusEnum>;

export type PriorAnalysisEdit = ResumeEdit & { status: PriorEditStatus };

export interface PriorAnalysisContext {
	analysisId: string;
	edits: PriorAnalysisEdit[];
	scoreBreakdown: ResumeAnalysisScoreBreakdown;
	scoreOverall: ResumeAnalysis["scoreOverall"];
}

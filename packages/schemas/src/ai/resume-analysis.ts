import { z } from "zod";
import {
	editActionEnum,
	editCategoryEnum,
	editSeverityEnum,
	resumeAnalysisScoreBreakdownKeys,
	scoreBreakdownSchema,
	scoreField,
} from "./resume-analysis-enums";
import { resumeQualityGateSchema } from "./resume-quality-gates";

export type {
	ResumeAnalysisEditStatus,
	ResumeAnalysisEditStatuses,
	ResumeAnalysisEditStatusRecord,
} from "@stackk-career/db/schema/resume-analyses";
export type { EditAction, EditCategory, EditSeverity, ResumeAnalysisScoreBreakdown } from "./resume-analysis-enums";
export {
	editActionEnum,
	editCategoryEnum,
	editSeverityEnum,
	resumeAnalysisScoreBreakdownKeys,
	scoreBreakdownSchema,
	scoreField,
};

/**
 * Draft edit emitted by the model. Carries the raw suggestion shape only — no
 * stable id, applyability, or evidence. The normalizer derives those before the
 * analysis is persisted.
 */
export const resumeEditDraftSchema = z.object({
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
});
export type ResumeEditDraft = z.infer<typeof resumeEditDraftSchema>;

/**
 * Raw model output. The model owns suggestions and a first-pass score estimate;
 * it does NOT own the final weighted overall, caps, ceilings, or floors — those
 * are recomputed deterministically by the normalizer.
 */
export const resumeAnalysisDraftSchema = z.object({
	scoreOverall: scoreField,
	scoreBreakdown: scoreBreakdownSchema,
	edits: z.array(resumeEditDraftSchema).max(5),
});
export type ResumeAnalysisDraft = z.infer<typeof resumeAnalysisDraftSchema>;

/** Where a factual claim in an edit is grounded. Anti-hallucination evidence. */
export const editEvidenceSourceEnum = z.enum(["resume", "target_job", "user_answer"]);
export type EditEvidenceSource = z.infer<typeof editEvidenceSourceEnum>;

export const resumeEditEvidenceSchema = z.object({
	source: editEvidenceSourceEnum,
	blockId: z.number().int().positive().nullish(),
	fieldPath: z.string().min(1).nullish(),
	quote: z.string().min(1),
});
export type ResumeEditEvidence = z.infer<typeof resumeEditEvidenceSchema>;

/**
 * How an edit can be applied.
 * - `one_click`: server can mutate the resume block directly.
 * - `user_input`: needs facts only the user can supply (paired with a request).
 * - `informational`: global advice with no single-block mutation.
 */
export const editApplyabilityEnum = z.enum(["one_click", "user_input", "informational"]);
export type EditApplyability = z.infer<typeof editApplyabilityEnum>;

/** Persisted edit: a draft edit enriched with a stable id, applyability, and evidence. */
export const resumeEditSchema = resumeEditDraftSchema.extend({
	editId: z.string().min(1),
	applyability: editApplyabilityEnum,
	evidence: z.array(resumeEditEvidenceSchema),
});
export type ResumeEdit = z.infer<typeof resumeEditSchema>;

/** A fact only the user can supply, modeled as a first-class request (not a fake edit). */
export const resumeUserInputRequestSchema = z.object({
	id: z.string().min(1),
	category: editCategoryEnum,
	question: z.string().min(1),
	whyItMatters: z.string().min(1),
	targetBlockId: z.number().int().positive().nullish(),
	unlocksPotentialPoints: z.number().int().min(0).max(100),
});
export type ResumeUserInputRequest = z.infer<typeof resumeUserInputRequestSchema>;

/**
 * Highest score reachable by applying every safe one-click edit, WITHOUT
 * user-supplied facts or manual structure changes. `blockers` explain what
 * still caps the score below 100.
 */
export const resumeScoreCeilingSchema = z.object({
	scoreOverall: scoreField,
	scoreBreakdown: scoreBreakdownSchema,
	blockers: z.array(z.string().min(1)),
});
export type ResumeScoreCeiling = z.infer<typeof resumeScoreCeilingSchema>;

/**
 * Normalized, persisted resume analysis. Score math, caps, ceilings, and floors
 * are owned by deterministic server code (the normalizer), not the model.
 */
export const resumeAnalysisSchema = z.object({
	rubricVersion: z.string().min(1),
	scoreOverall: scoreField,
	scoreBreakdown: scoreBreakdownSchema,
	qualityGates: z.array(resumeQualityGateSchema),
	scoreCeiling: resumeScoreCeilingSchema,
	edits: z.array(resumeEditSchema).max(5),
	userInputRequests: z.array(resumeUserInputRequestSchema),
});
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type ResumeAnalysisObject = ResumeAnalysis;

export const priorEditStatusEnum = z.enum(["applied", "dismissed", "pending"]);
export type PriorEditStatus = z.infer<typeof priorEditStatusEnum>;

export type PriorAnalysisEdit = ResumeEdit & { status: PriorEditStatus };

export interface PriorAnalysisContext {
	analysisId: string;
	edits: PriorAnalysisEdit[];
	scoreBreakdown: ResumeAnalysis["scoreBreakdown"];
	scoreOverall: ResumeAnalysis["scoreOverall"];
}

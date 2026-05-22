import { z } from "zod";
import {
	contactContentSchema,
	entryContentSchema,
	paragraphContentSchema,
	skillItemContentSchema,
	skillLineContentSchema,
} from "../db/resume-blocks";

export const resumeParserInputSchema = z
	.object({
		userId: z.string(),
		fileId: z.string().optional(),
		fileUrl: z.url().optional(),
		generationId: z.string().optional(),
		displayName: z.string().optional(),
	})
	.refine((value) => Boolean(value.fileId) !== Boolean(value.fileUrl), {
		message: "Provide exactly one of fileId or fileUrl",
	});

export const resumeValidationSchema = z.object({
	isResume: z.boolean(),
	confidence: z.number().min(0).max(1),
	candidateName: z.string().nullable(),
	reason: z.string(),
});

// Wrap arrays in named-key objects because Output.object requires an object root.
// Entry/skill_line content schemas are reused as-is — the LLM emits the final
// shape (including bullets-as-<ul> inside descriptor) directly.

export const extractedSummarySchema = z.object({
	paragraphs: z.array(paragraphContentSchema).default([]),
});

export const extractedEntriesSectionSchema = z.object({
	entries: z.array(entryContentSchema).default([]),
});

export const extractedSkillLineSchema = skillLineContentSchema.extend({
	items: z.array(skillItemContentSchema).default([]),
});

export const extractedSkillsSectionSchema = z.object({
	lines: z.array(extractedSkillLineSchema).default([]),
});

export type EntriesSection = z.infer<typeof extractedEntriesSectionSchema>;
export type SkillsSection = z.infer<typeof extractedSkillsSectionSchema>;
export type SummarySection = z.infer<typeof extractedSummarySchema>;

// Bundle schemas — one LLM call extracts every section of the same shape at once.
// Cuts gateway fan-out from 9 parallel calls to 2 (entries + skills) per resume.
// Each field is independently nullable in case the source PDF lacks that section.

export const extractedHeaderSchema = z.object({
	contact: contactContentSchema.nullable().default(null),
	summary: extractedSummarySchema.nullable().default(null),
});

export const extractedEntriesBundleSchema = z.object({
	experience: extractedEntriesSectionSchema.nullable().default(null),
	education: extractedEntriesSectionSchema.nullable().default(null),
	certifications: extractedEntriesSectionSchema.nullable().default(null),
	projects: extractedEntriesSectionSchema.nullable().default(null),
	volunteering: extractedEntriesSectionSchema.nullable().default(null),
});

export const extractedSkillsBundleSchema = z.object({
	skills: extractedSkillsSectionSchema.nullable().default(null),
	languages: extractedSkillsSectionSchema.nullable().default(null),
});

export type HeaderBundle = z.infer<typeof extractedHeaderSchema>;
export type EntriesBundle = z.infer<typeof extractedEntriesBundleSchema>;
export type SkillsBundle = z.infer<typeof extractedSkillsBundleSchema>;

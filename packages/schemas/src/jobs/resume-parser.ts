import { z } from "zod";
import { skillCategorySchema, skillProficiencySchema } from "../db/resume-blocks";

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
	isResume: z.boolean().describe("True only when the document is clearly a personal resume / CV."),
	confidence: z.number().min(0).max(1).describe("Confidence in the decision, from 0.0 to 1.0."),
	candidateName: z.string().nullable().describe("Candidate's full name from the resume, or null when not present."),
	reason: z.string().describe("One short factual sentence explaining the decision, grounded in observed content."),
});

// Parser-specific schemas with .describe() on every field. Descriptions are
// forwarded to the model via JSON Schema and act as strong field-level
// instructions — much more reliable than prose system prompts. Keep the DB
// schema clean by mirroring shapes here instead of decorating the DB schema.

const parserContactItemSchema = z.object({
	kind: z
		.enum(["address", "email", "phone", "linkedin", "website", "other"])
		.describe("Type of contact item. Use 'other' only when none of the named kinds fit."),
	value: z
		.string()
		.describe(
			"Contact value as written in the PDF (verbatim). Examples: 'jane@acme.com', '+1 555 0100', 'linkedin.com/in/jane'."
		),
	label: z
		.string()
		.optional()
		.describe("Optional human label override. Omit unless the PDF clearly labels this item differently from its kind."),
});

const parserContactSchema = z.object({
	firstName: z.string().describe("Candidate's first name from the resume header. Empty string when truly absent."),
	lastName: z.string().describe("Candidate's last name from the resume header. Empty string when truly absent."),
	items: z
		.array(parserContactItemSchema)
		.describe("Every contact info entry visible in the PDF header (emails, phones, links, addresses)."),
});

const parserParagraphSchema = z.object({
	text: z
		.string()
		.max(2000)
		.describe("Paragraph text. Wrap in a single <p>...</p> when format is 'html'. Copy verbatim from the PDF."),
	format: z.enum(["plain", "html"]).default("html").describe("Format of the text. Default 'html'."),
	aiSuggested: z
		.boolean()
		.default(false)
		.describe("Always false for extracted content (set true only by AI rewrite flows)."),
	originalText: z.string().optional().describe("Always omit. Reserved for AI rewrites."),
});

const parserEntryContentSchema = z.object({
	title: z
		.string()
		.describe(
			"Primary entry heading. For work: job role (e.g. 'Senior Software Engineer'). For education: degree (e.g. 'B.Sc. Computer Science'). For certifications: cert name. For projects: project name. For volunteering: role. Short. No commentary."
		),
	subtitle: z
		.string()
		.optional()
		.describe(
			"Secondary heading. For work: company name only. For education: school/institution. For certifications: issuer. For projects: optional role/team. For volunteering: organization. Short. Just the entity, no extras."
		),
	location: z
		.string()
		.optional()
		.describe(
			"Place string only: city, region, country. Examples: 'Lima, Peru', 'New York, NY', 'Remote', 'Hybrid'. Omit when truly absent. NEVER write descriptions, duties, bullets, tech stack, or sentences here."
		),
	isRemote: z.boolean().default(false).describe("True when the role is explicitly remote or hybrid."),
	startDate: z
		.string()
		.optional()
		.describe(
			"Start date in 'YYYY-MM' format. 'July 2025' → '2025-07'. '2023' → '2023-01'. REQUIRED whenever a start date appears in the PDF."
		),
	endDate: z
		.string()
		.nullable()
		.optional()
		.describe(
			"End date in 'YYYY-MM' format. Year-only → 'YYYY-12'. OMIT when isCurrent is true. REQUIRED whenever an end date appears in the PDF and the role is not ongoing."
		),
	isCurrent: z
		.boolean()
		.default(false)
		.describe(
			"True only when the entry is ongoing — PDF says 'Present', 'Current', 'Now', or 'Actual'. When true, endDate must be omitted."
		),
	descriptor: z
		.string()
		.optional()
		.describe(
			"HTML body of the entry. Required whenever any text follows the header. Bullet lists from the source → one <ul><li>...</li></ul> block. Paragraphs → <p>...</p> before the list. Allowed tags only: p, ul, ol, li, strong, em, b, i, br. Copy text verbatim. Omit ONLY when the entry has zero body text below the header."
		),
	descriptorFormat: z
		.enum(["plain", "html"])
		.default("html")
		.describe("Format of descriptor. Always 'html' when descriptor is set."),
	entryStyle: z
		.enum(["standard", "condensed", "publication"])
		.default("standard")
		.describe("Always 'standard' for parsed entries."),
});

const parserSkillItemSchema = z.object({
	value: z.string().describe("The skill as written in the PDF (verbatim). Examples: 'TypeScript', 'AWS', 'React'."),
	proficiency: skillProficiencySchema
		.optional()
		.describe("Set ONLY when the PDF explicitly states a proficiency level. Otherwise omit."),
	skillKind: z
		.enum(["language_prog", "framework", "tool", "spoken_lang", "lab_technique", "interest", "certification", "other"])
		.optional()
		.describe("Optional finer-grained skill type. Omit when unsure."),
});

const parserSkillLineSchema = z.object({
	label: z
		.string()
		.describe(
			"Row heading from the PDF (e.g. 'Languages', 'Frameworks', 'Cloud'). When the PDF lists skills without sub-headings, choose a sensible label."
		),
	category: skillCategorySchema
		.default("other")
		.describe(
			"Category for this row. For the 'languages' section every line must use 'languages'. For the 'skills' section pick one of {technical, laboratory, interests, certifications, other}."
		),
	items: z
		.array(parserSkillItemSchema)
		.describe("Every skill item in this row. Do not drop items even if the line is long."),
});

// Wrap arrays in named-key objects because Output.object requires an object root.
// Schemas mirror DB shapes but with `.describe()` on each field for the LLM.

export const extractedSummarySchema = z.object({
	paragraphs: z
		.array(parserParagraphSchema)
		.default([])
		.describe(
			"Paragraphs of the candidate's professional summary / objective / profile. Empty array when no summary block exists in the PDF."
		),
});

export const extractedEntriesSectionSchema = z.object({
	entries: z
		.array(parserEntryContentSchema)
		.default([])
		.describe("All entries for this section, in the PDF's document order. Empty when the section has zero entries."),
});

export const extractedSkillsSectionSchema = z.object({
	lines: z
		.array(parserSkillLineSchema)
		.default([])
		.describe("Every skill row in this section. Empty when no skills exist."),
});

export type EntriesSection = z.infer<typeof extractedEntriesSectionSchema>;
export type SkillsSection = z.infer<typeof extractedSkillsSectionSchema>;
export type SummarySection = z.infer<typeof extractedSummarySchema>;

// Bundle schemas — one LLM call extracts every section of the same shape at once.
// Cuts gateway fan-out from 9 parallel calls to 2 (entries + skills) per resume.
// Each field is independently nullable in case the source PDF lacks that section.

export const extractedHeaderSchema = z.object({
	contact: parserContactSchema
		.nullable()
		.default(null)
		.describe("Candidate's contact block. Null when no contact info exists in the PDF."),
	summary: extractedSummarySchema
		.nullable()
		.default(null)
		.describe(
			"Candidate's professional summary / objective paragraph block. Null when absent. Never include job descriptions or bullet lists here."
		),
});

// Experience is split into its own call — heaviest section by output tokens
// (many jobs × many HTML bullets each), so isolating it avoids truncation of
// the rest of the entries family when the resume is dense.
export const extractedEntriesBundleSchema = z.object({
	education: extractedEntriesSectionSchema
		.nullable()
		.default(null)
		.describe("EDUCATION section: degrees, schools, bootcamps, formal studies. Null when absent."),
	certifications: extractedEntriesSectionSchema
		.nullable()
		.default(null)
		.describe("CERTIFICATIONS section: certifications, licenses, credentials. Null when absent."),
	projects: extractedEntriesSectionSchema
		.nullable()
		.default(null)
		.describe("PROJECTS section: personal, academic, or notable side projects. Null when absent."),
	volunteering: extractedEntriesSectionSchema
		.nullable()
		.default(null)
		.describe("VOLUNTEERING section: volunteer roles, pro bono, community work. Null when absent."),
});

export const extractedSkillsBundleSchema = z.object({
	skills: extractedSkillsSectionSchema
		.nullable()
		.default(null)
		.describe(
			"Technical skills section: programming languages, frameworks, tools, certifications. Null when absent. Use line.category ∈ {technical, laboratory, interests, certifications, other}."
		),
	languages: extractedSkillsSectionSchema
		.nullable()
		.default(null)
		.describe(
			"Spoken human languages only (English, Spanish, etc.). Every line.category MUST be 'languages'. Programming languages go in the skills section, NOT here. Null when absent."
		),
});

export type HeaderBundle = z.infer<typeof extractedHeaderSchema>;
export type EntriesBundle = z.infer<typeof extractedEntriesBundleSchema>;
export type SkillsBundle = z.infer<typeof extractedSkillsBundleSchema>;

// Trigger metadata vocabulary — single source of truth, imported by both the
// handler (`packages/jobs/src/agents/resume-parser.handler.ts`) and the task
// (`packages/jobs/src/trigger/tasks/resume-parser.ts`).
export const resumeParserStepSchema = z.enum([
	"resolving_file",
	"running_agent",
	"creating_records",
	"inserting_blocks",
	"complete",
]);

export const resumeParserPhaseSchema = z.enum(["validation", "header", "experience", "entries", "skills"]);
export const resumeParserPhaseStatusSchema = z.enum(["running", "complete", "failed", "canceled"]);

export type ResumeParserStep = z.infer<typeof resumeParserStepSchema>;
export type ResumeParserPhase = z.infer<typeof resumeParserPhaseSchema>;
export type ResumeParserPhaseStatus = z.infer<typeof resumeParserPhaseStatusSchema>;

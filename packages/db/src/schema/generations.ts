import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { fileMetadata } from "./file-metadata";
import { messages } from "./messages";
import { resumeAnalyses } from "./resume-analyses";

// `resume-creation` = AI-generated resume from an uploaded source (PDF parser). `resume-manual` =
// blank-editor resume created by hand. Only `resume-creation` counts toward the per-cycle AI quota
// (`resume_creation_generations_per_cycle`); manual resumes are bounded solely by `resumes_total`.
// `cover-letter` = CASEY cover-letter generation.
export const generationTypes = ["conversation", "resume-creation", "resume-manual", "cover-letter"] as const;
export type GenerationTypes = (typeof generationTypes)[number];

/**
 * Supported languages for generated artifacts (today: cover-letter). `es` covers neutral
 * LATAM / es-PE — default; `en` is American English for international applications.
 * To add pt or fr: extend this list + write few-shot examples + a "Language" block in
 * the system prompt.
 */
export const generationLanguages = ["es", "en"] as const;
export type GenerationLanguage = (typeof generationLanguages)[number];

export const generations = sqliteTable(
	"generations",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `gen_${createId()}`),
		owner: t.text().references(() => user.id),

		title: t.text(),
		summary: t.text(),
		model: t.text(),
		type: t.text({ enum: generationTypes }),

		// For type="cover-letter": the resume.id this letter is linked to (selected in the /letters dialog).
		// Plain text column (no FK at the DB level) to avoid circular import with the resumes schema;
		// ownership/validity enforced in the API procedure that creates the generation.
		resumeId: t.text(),

		// For type="cover-letter": user-selected output language for the artifact.
		// Propagated end-to-end (create → trigger → task → agent system prompt + few-shot block).
		language: t.text({ enum: generationLanguages }).default("es").notNull(),

		// For type="cover-letter": user-selected template (standard, modern, editorial, creative, vibrant).
		// Type-only enum (SQLite text, no CHECK). Legacy rows may hold centered/classic/minty/blue;
		// the UI normalizes any legacy/empty value on read via `normalizeTemplate`.
		template: t.text({ enum: ["standard", "modern", "editorial", "creative", "vibrant"] }),

		// For type="cover-letter": provenance of the letter's job context. `resume-job-target`
		// snapshotted the resume's normalized LinkedIn target into title/summary; `manual` = the
		// user-typed job position/description. Drives CASEY's prompt framing (<TARGET_JOB> vs
		// <JOB_DESCRIPTION>) and the "used the saved listing" chip. Legacy rows default to `manual`.
		jobContextSource: t
			.text({ enum: ["manual", "resume-job-target"] })
			.default("manual")
			.notNull(),

		createdAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: t
			.integer({ mode: "timestamp" })
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	(t) => [
		// Simple per-column indexes (review decision: no composites). `owner` keeps its
		// original name — it already exists in the remote DB, so db:push won't drop it.
		index("generation_owner_id_idx").on(t.owner),
		index("generation_type_idx").on(t.type),
		index("generation_resume_id_idx").on(t.resumeId),
	]
);

export const generationsRelations = relations(generations, ({ one, many }) => ({
	messages: many(messages),
	files: many(fileMetadata),

	owner: one(user, {
		fields: [generations.owner],
		references: [user.id],
	}),
	resumeAnalysis: many(resumeAnalyses),
}));

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
 * Idiomas soportados para artifacts generados (hoy: cover-letter).
 * `es` cubre LATAM neutro / es-PE — default. `en` agrega flujo en inglés americano
 * para postulaciones a roles internacionales. Para sumar pt o fr: agregar a esta
 * lista + escribir few-shot examples + bloque de "Language" en el system prompt.
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

		createdAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: t
			.integer({ mode: "timestamp" })
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	(t) => [index("generation_owner_id_idx").on(t.owner)]
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

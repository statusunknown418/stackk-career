import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { fileMetadata } from "./file-metadata";
import { messages } from "./messages";
import { resumeAnalyses } from "./resume-analyses";

export const generationTypes = ["conversation", "resume-creation", "cover-letter"] as const;
export type GenerationTypes = (typeof generationTypes)[number];

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

import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { user } from "./auth";
import { generations } from "./generations";
import { resumeBlocks } from "./resume-blocks";

export const resumeStatusEnum = ["draft", "ready", "archived"] as const;

export const resumes = sqliteTable(
	"resumes",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `resume_${createId}`),
		templateId: t.text(),
		generationId: t.text(),
		userId: t.text().notNull(),

		targetedCompanyIdentifier: t.text(),
		isPrimary: t.integer({ mode: "boolean" }).notNull().default(false),
		aiMetadata: t.blob({ mode: "json" }).$type<{ agentScore: number; agentCreated: boolean }>(),
		status: t.text({ enum: resumeStatusEnum }).default("draft").notNull(),
		displayName: t.text().notNull().default("Nuevo CV"),
		title: t.text().notNull().default("Jon Doe"),

		createdAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$onUpdateFn(() => new Date()),
	}),
	(t) => [
		index("resume_isPrimary_idx").on(t.isPrimary),
		index("resume_generationId_idx").on(t.generationId),
		index("resume_userId_idx").on(t.userId),
	]
);

export const insertResume = createInsertSchema(resumes);

export const resumeRelations = relations(resumes, ({ one, many }) => ({
	blocks: many(resumeBlocks),

	generation: one(generations, {
		fields: [resumes.generationId],
		references: [generations.id],
	}),
	owner: one(user, {
		fields: [resumes.userId],
		references: [user.id],
	}),
}));

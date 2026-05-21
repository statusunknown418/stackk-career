import { createId } from "@paralleldrive/cuid2";
import type { LanguageModel } from "ai";
import { relations } from "drizzle-orm";
import { type AnySQLiteColumn, index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { generations } from "./generations";
import { resumes } from "./resumes";

export const resumeAnalysisStatusEnum = ["pending", "running", "ready", "failed"] as const;
export type ResumeAnalysisStatus = (typeof resumeAnalysisStatusEnum)[number];

export const resumeAnalyses = sqliteTable(
	"resume_analyses",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `res_als_${createId()}`),
		generationId: t
			.text()
			.notNull()
			.references(() => generations.id, { onDelete: "cascade" }),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		resumeId: t.text().references(() => resumes.id, { onDelete: "set null" }),
		parentAnalysisId: t.text().references((): AnySQLiteColumn => resumeAnalyses.id, { onDelete: "set null" }),

		status: t.text({ enum: resumeAnalysisStatusEnum }).notNull().default("pending"),

		model: t.text().$type<LanguageModel>(),
		object: t.text({ mode: "json" }),
		error: t.text(),

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
		index("ra_resume_idx").on(t.resumeId),
		index("ra_gen_idx").on(t.generationId),
		index("ra_parent_idx").on(t.parentAnalysisId),
	]
);

export const resumeAnalysesRelations = relations(resumeAnalyses, ({ one, many }) => ({
	generation: one(generations, {
		fields: [resumeAnalyses.generationId],
		references: [generations.id],
	}),
	user: one(user, {
		fields: [resumeAnalyses.userId],
		references: [user.id],
	}),
	resume: one(resumes, {
		fields: [resumeAnalyses.resumeId],
		references: [resumes.id],
	}),
	parent: one(resumeAnalyses, {
		fields: [resumeAnalyses.parentAnalysisId],
		references: [resumeAnalyses.id],
		relationName: "parent_analysis",
	}),
	children: many(resumeAnalyses, { relationName: "parent_analysis" }),
}));

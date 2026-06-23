import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { generations } from "./generations";
import { resumeAnalyses } from "./resume-analyses";
import { resumeBlocks } from "./resume-blocks";
import { resumeJobTargets } from "./resume-job-targets";

export const resumeStatusEnum = ["draft", "ready", "archived"] as const;

export const resumes = sqliteTable(
	"resumes",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `resume_${createId()}`),
		templateId: t.text(),
		generationId: t
			.text()
			.notNull()
			.references(() => generations.id, { onDelete: "cascade" }),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		targetedCompanyIdentifier: t.text(),
		targetRole: t.text(),
		isPrimary: t.integer({ mode: "boolean" }).notNull().default(false),
		aiMetadata: t.text({ mode: "json" }).$type<{ agentScore: number; agentCreated: boolean }>(),
		status: t.text({ enum: resumeStatusEnum }).default("draft").notNull(),
		displayName: t.text().notNull().default("CV sin título"),
		title: t.text().notNull().default("CV sin título"),

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

export const resumeRelations = relations(resumes, ({ one, many }) => ({
	blocks: many(resumeBlocks),
	analyses: many(resumeAnalyses),
	jobTarget: one(resumeJobTargets, {
		fields: [resumes.id],
		references: [resumeJobTargets.resumeId],
	}),

	generation: one(generations, {
		fields: [resumes.generationId],
		references: [generations.id],
	}),
	owner: one(user, {
		fields: [resumes.userId],
		references: [user.id],
	}),
}));

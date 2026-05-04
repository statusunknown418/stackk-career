import { createId } from "@paralleldrive/cuid2";
import type { LanguageModel } from "ai";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { generations } from "./generations";
import { resumeAnalyses } from "./resume-analyses";

export const messages = sqliteTable(
	"messages",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `msg_${createId()}`),
		generationId: t
			.text()
			.notNull()
			.references(() => generations.id),
		parentMessageId: t.text(),
		analysisId: t.text().references(() => resumeAnalyses.id, { onDelete: "set null" }),

		content: t.text({ mode: "json" }),
		text: t.text(),
		error: t.text(),
		model: t.text().$type<string & LanguageModel>(),
		order: t.integer(),
		toolMeta: t.blob({ mode: "json" }).$type<{ toolId: string; toolName: string }>(),
		isTool: t.integer({ mode: "boolean" }),
		isAssistant: t.integer({ mode: "boolean" }).notNull().default(false),

		objectType: t.text(),
		object: t.blob({ mode: "json" }),

		createdAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	}),
	(t) => [index("messages_gen_idx").on(t.generationId), index("messages_analysis_idx").on(t.analysisId)]
);

export const messagesRelations = relations(messages, ({ one }) => ({
	parentMessage: one(messages, {
		fields: [messages.parentMessageId],
		references: [messages.id],
		relationName: "parent_message",
	}),
	analysis: one(resumeAnalyses, {
		fields: [messages.analysisId],
		references: [resumeAnalyses.id],
	}),
}));

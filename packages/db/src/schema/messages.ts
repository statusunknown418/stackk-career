import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { generations } from "./generations";

export const messages = sqliteTable("messages", (t) => ({
	id: t
		.text()
		.primaryKey()
		.$defaultFn(() => `msg_${createId()}`),
	generationId: t.text().references(() => generations.id),
	parentMessageId: t.text(),

	text: t.text(),
	error: t.text(),
	model: t.text(),
	order: t.integer(),
	isTool: t.integer({ mode: "boolean" }),
	isAssistant: t.integer({ mode: "boolean" }).notNull().default(false),

	createdAt: t
		.integer({ mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	parentMessage: one(messages, {
		fields: [messages.id],
		references: [messages.id],
		relationName: "parent_message",
	}),
}));

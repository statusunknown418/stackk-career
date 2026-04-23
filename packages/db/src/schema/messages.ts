import { sqliteTable } from "drizzle-orm/sqlite-core";

export const generativeMessages = sqliteTable("generativeMessages", (t) => ({
	generationId: t.text(),
	parentMessageId: t.text(),

	content: t.text(),
	isTool: t.integer({ mode: "boolean" }),

	createdAt: t.integer({ mode: "timestamp" }),
}));

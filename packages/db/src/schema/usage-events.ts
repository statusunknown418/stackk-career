import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export type UsageEventKind = (typeof usageEventKind)[number];
export const usageEventKind = ["chat", "object", "embed", "image", "tool"] as const;

export const usageEvents = sqliteTable(
	"usage_events",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `ue_${createId()}`),

		userId: t.text().references(() => user.id, { onDelete: "set null" }),

		kind: t.text({ enum: usageEventKind }).notNull(),
		provider: t.text().notNull(),
		model: t.text().notNull(),
		inputTokens: t.integer().notNull().default(0),
		outputTokens: t.integer().notNull().default(0),
		totalTokens: t.integer().notNull().default(0),
		reasoningTokens: t.integer().notNull().default(0),
		metadata: t.blob({ mode: "json" }).$type<Record<string, unknown>>(),

		createdAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	}),
	(t) => [index("usage_events_user_created_idx").on(t.userId, t.createdAt)]
);

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
	user: one(user, {
		fields: [usageEvents.userId],
		references: [user.id],
	}),
}));

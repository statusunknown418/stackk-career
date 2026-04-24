import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { messages } from "./messages";

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

	owner: one(user, {
		fields: [generations.owner],
		references: [user.id],
	}),
}));

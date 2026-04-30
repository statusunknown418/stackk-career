import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { generations } from "./generations";

export const fileMetadata = sqliteTable(
	"fileMetadata",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `file_${createId()}`),
		userId: t
			.text()
			.notNull()
			.references(() => user.id),
		generationId: t.text().references(() => generations.id),

		name: t.text(),
		url: t.text().notNull(),
		metadata: t.blob({ mode: "json" }),
		storageId: t.text(),

		createdAt: t.integer({
			mode: "timestamp",
		}),
	}),
	(table) => [index("files_userId").on(table.userId)]
);

export const filesRelations = relations(fileMetadata, ({ one }) => ({
	owner: one(user, {
		fields: [fileMetadata.userId],
		references: [user.id],
	}),

	generation: one(generations, {
		fields: [fileMetadata.generationId],
		references: [generations.id],
	}),
}));

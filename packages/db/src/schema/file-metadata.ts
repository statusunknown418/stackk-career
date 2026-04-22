import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const fileMetadata = sqliteTable(
	"fileMetadata",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `file_${createId()}`),
		url: t.text().notNull(),
		metadata: t.blob({ mode: "json" }),
		storageId: t.text(),

		userId: t
			.text()
			.notNull()
			.references(() => user.id),

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
}));

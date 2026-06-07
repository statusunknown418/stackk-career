import { createId } from "@paralleldrive/cuid2";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";

/**
 * Pre-launch waitlist: visitors leave their phone (WhatsApp) so we can reach out
 * when the product goes live. Captured from the public `/waitlist` page — no auth.
 */
export const waitlist = sqliteTable(
	"waitlist",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `wl_${createId()}`),
		name: t.text(),
		phone: t.text().notNull(),
		email: t.text(),
		/** Where the signup came from (e.g. "landing-waitlist"). */
		source: t.text(),
		createdAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
	}),
	(table) => [index("waitlist_createdAt").on(table.createdAt)]
);

import { createId } from "@paralleldrive/cuid2";
import { sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

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
	// Unique on email → permite el upsert (onConflictDoUpdate) cuando alguien reenvía
	// el mismo correo. email es nullable: en SQLite los NULL son distintos, así que los
	// registros sin correo siempre insertan sin chocar.
	(table) => [uniqueIndex("waitlist_email").on(table.email)]
);

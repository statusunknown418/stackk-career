import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const transactionalEmailTypes = ["welcome", "engagement_nudge"] as const;
export type TransactionalEmailType = (typeof transactionalEmailTypes)[number];

/**
 * Audit + dedup log for transactional mail. The unique `(userId, type)` index is
 * the idempotency guard: senders `insert(...).onConflictDoNothing()` and treat a
 * zero-row result as "already sent" — so welcome mail and the once-per-user
 * engagement nudge never go out twice across task retries.
 */
export const transactionalEmails = sqliteTable(
	"transactional_emails",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `txem_${createId()}`),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: t.text({ enum: transactionalEmailTypes }).notNull(),
		resendId: t.text(),
		sentAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		createdAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	}),
	(t) => [uniqueIndex("transactional_emails_user_type_idx").on(t.userId, t.type)]
);

export const transactionalEmailsRelations = relations(transactionalEmails, ({ one }) => ({
	user: one(user, {
		fields: [transactionalEmails.userId],
		references: [user.id],
	}),
}));

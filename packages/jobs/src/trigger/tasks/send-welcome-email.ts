import { getTriggerDb } from "@stackk-career/db/http";
import { transactionalEmails } from "@stackk-career/db/schema/transactional-emails";
import { sendTransactionalEmailInputSchema } from "@stackk-career/schemas/jobs/transactional";
import { sendWelcomeEmail } from "@stackk-career/transactional";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";

/**
 * Post-signup welcome email. Enqueued (fire-and-forget) from the better-auth
 * `user.create.after` hook so the sign-in request never waits on Resend.
 *
 * Idempotent two ways: the `(userId, type)` unique row is inserted first and a
 * conflict short-circuits the send, and the Resend call carries an idempotency
 * key — so task retries never double-send.
 */
export const sendWelcomeEmailTask = schemaTask({
	id: "send-welcome-email",
	schema: sendTransactionalEmailInputSchema,
	maxDuration: 30,
	run: async ({ userId, email, name }) => {
		const db = getTriggerDb();

		const [row] = await db
			.insert(transactionalEmails)
			.values({ userId, type: "welcome" })
			.onConflictDoNothing({ target: [transactionalEmails.userId, transactionalEmails.type] })
			.returning({ id: transactionalEmails.id });

		if (!row) {
			logger.info("send-welcome-email skipped (already sent)", { userId });
			return { skipped: true as const };
		}

		const { id: resendId } = await sendWelcomeEmail({ to: email, name, idempotencyKey: `welcome:${userId}` });
		await db.update(transactionalEmails).set({ resendId }).where(eq(transactionalEmails.id, row.id));

		logger.info("send-welcome-email sent", { userId, resendId });
		return { skipped: false as const, resendId };
	},
});

import { getTriggerDb } from "@stackk-career/db/http";
import { transactionalEmails } from "@stackk-career/db/schema/transactional-emails";
import { sendTransactionalEmailInputSchema } from "@stackk-career/schemas/jobs/transactional";
import { sendEngagementNudgeEmail } from "@stackk-career/transactional";
import { logger, schedules, schemaTask } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { selectUsersForNudge } from "../../lib/engagement";

/**
 * Sends one engagement nudge to a single inactive user. Fanned out (one run per
 * user) from the daily schedule so each send retries independently. The
 * `(userId, type)` unique row + Resend idempotency key make it send-once.
 */
export const sendEngagementNudgeTask = schemaTask({
	id: "send-engagement-nudge",
	schema: sendTransactionalEmailInputSchema,
	maxDuration: 30,
	run: async ({ userId, email, name }) => {
		const db = getTriggerDb();

		const [row] = await db
			.insert(transactionalEmails)
			.values({ userId, type: "engagement_nudge" })
			.onConflictDoNothing({ target: [transactionalEmails.userId, transactionalEmails.type] })
			.returning({ id: transactionalEmails.id });

		if (!row) {
			logger.info("send-engagement-nudge skipped (already sent)", { userId });
			return { skipped: true as const };
		}

		const { id: resendId } = await sendEngagementNudgeEmail({
			to: email,
			name,
			idempotencyKey: `nudge:${userId}`,
		});
		await db.update(transactionalEmails).set({ resendId }).where(eq(transactionalEmails.id, row.id));

		logger.info("send-engagement-nudge sent", { userId, resendId });
		return { skipped: false as const, resendId };
	},
});

/**
 * Daily scan (09:00 America/Lima) that finds users who signed up 1–2 days ago and
 * never engaged (no onboarding profile or no resume) and fans out one
 * `send-engagement-nudge` run per user.
 */
export const engagementNudgeScheduleTask = schedules.task({
	id: "engagement-nudge",
	cron: { pattern: "0 9 * * *", timezone: "America/Lima" },
	run: async () => {
		const db = getTriggerDb();
		const candidates = await selectUsersForNudge(db, new Date());

		logger.info("engagement-nudge scan", { candidates: candidates.length });
		if (candidates.length === 0) {
			return { triggered: 0 };
		}

		await sendEngagementNudgeTask.batchTrigger(
			candidates.map((candidate) => ({
				payload: { userId: candidate.userId, email: candidate.email, name: candidate.name },
				options: { tags: [`user:${candidate.userId}`, "engagement-nudge"] },
			}))
		);

		return { triggered: candidates.length };
	},
});

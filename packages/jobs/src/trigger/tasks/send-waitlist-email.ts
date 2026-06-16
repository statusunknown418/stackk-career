import { sendWaitlistEmailInputSchema } from "@stackk-career/schemas/jobs/transactional";
import { sendWaitlistConfirmationEmail } from "@stackk-career/transactional";
import { logger, schemaTask } from "@trigger.dev/sdk";

/**
 * Waitlist confirmation email. Enqueued (fire-and-forget) from the public
 * `waitlist.join` handler so the signup request never waits on Resend.
 *
 * Waitlist signups have no `user` row, so there's no `transactional_emails`
 * dedup row here — the Resend idempotency key (`waitlist-confirm:<email>`) is
 * the single send-once guard, collapsing task retries and rapid re-submits of
 * the same email into one delivery.
 */
export const sendWaitlistEmailTask = schemaTask({
	id: "send-waitlist-email",
	schema: sendWaitlistEmailInputSchema,
	maxDuration: 30,
	run: async ({ email, name }) => {
		const { id: resendId } = await sendWaitlistConfirmationEmail({
			to: email,
			name,
			idempotencyKey: `waitlist-confirm:${email}`,
		});

		logger.info("send-waitlist-email sent", { resendId });
		return { resendId };
	},
});

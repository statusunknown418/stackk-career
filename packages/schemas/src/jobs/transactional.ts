import { z } from "zod";

/**
 * Shared payload for the transactional-email Trigger tasks (`send-welcome-email`
 * and `send-engagement-nudge`). Carries the minimum the task needs so it doesn't
 * re-read the user row just to address the mail.
 */
export const sendTransactionalEmailInputSchema = z.object({
	userId: z.string(),
	email: z.email(),
	name: z.string().nullable(),
});

export type SendTransactionalEmailInput = z.infer<typeof sendTransactionalEmailInputSchema>;

/**
 * Payload for the `send-waitlist-email` task. Waitlist signups aren't `user`
 * rows, so there's no `userId` and no `transactional_emails` dedup row — the
 * Resend idempotency key (`waitlist-confirm:<email>`) is the send-once guard.
 */
export const sendWaitlistEmailInputSchema = z.object({
	email: z.email(),
	name: z.string().nullable(),
});

export type SendWaitlistEmailInput = z.infer<typeof sendWaitlistEmailInputSchema>;

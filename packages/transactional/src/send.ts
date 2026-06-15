import { env } from "@stackk-career/env/server";
import type { ReactElement } from "react";
import { getResend } from "./client";

export interface SendEmailInput {
	/**
	 * Stable key that makes the send safe to retry. Resend collapses repeated
	 * requests with the same key into a single delivery (24h window), so task
	 * retries never double-send.
	 */
	idempotencyKey?: string;
	react: ReactElement;
	subject: string;
	to: string;
}

/**
 * Render + deliver a single transactional email via Resend. Throws on the
 * Resend error union so callers (Trigger tasks) surface failures to their
 * retry policy instead of silently dropping mail.
 */
export async function sendEmail({ to, subject, react, idempotencyKey }: SendEmailInput): Promise<{ id: string }> {
	const { data, error } = await getResend().emails.send(
		{ from: env.EMAIL_FROM, react, subject, to },
		idempotencyKey ? { idempotencyKey } : undefined
	);

	if (error) {
		throw new Error(`Resend send failed: ${error.message}`);
	}

	return { id: data?.id ?? "" };
}

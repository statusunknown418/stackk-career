import { env } from "@stackk-career/env/server";
import type { ReactElement } from "react";
import { getResend } from "./client";

/** Matches the `<addr>` in a "Name <addr>" From header, else the bare address. */
const FROM_ADDRESS = /<([^>]+)>/;

/** Bare email address Resend sends from, used as the List-Unsubscribe target. */
function fromAddress(): string {
	return FROM_ADDRESS.exec(env.EMAIL_FROM)?.[1] ?? env.EMAIL_FROM;
}

export interface SendEmailInput {
	/** Extra headers merged over the defaults (e.g. override List-Unsubscribe). */
	headers?: Record<string, string>;
	/**
	 * Stable key that makes the send safe to retry. Resend collapses repeated
	 * requests with the same key into a single delivery (24h window), so task
	 * retries never double-send.
	 */
	idempotencyKey?: string;
	react: ReactElement;
	/** Address replies route to. Defaults to the From mailbox when omitted. */
	replyTo?: string;
	subject: string;
	to: string;
}

/**
 * Render + deliver a single transactional email via Resend. Throws on the
 * Resend error union so callers (Trigger tasks) surface failures to their
 * retry policy instead of silently dropping mail.
 *
 * Every send carries a `List-Unsubscribe` (mailto) header — required by the
 * Gmail/Yahoo bulk-sender rules and a deliverability signal that keeps mail out
 * of spam. Callers may override it via `headers`.
 */
export async function sendEmail({
	to,
	subject,
	react,
	idempotencyKey,
	replyTo,
	headers,
}: SendEmailInput): Promise<{ id: string }> {
	const unsubscribe = fromAddress();
	const { data, error } = await getResend().emails.send(
		{
			from: env.EMAIL_FROM,
			react,
			subject,
			to,
			replyTo: replyTo ?? unsubscribe,
			headers: {
				"List-Unsubscribe": `<mailto:${unsubscribe}?subject=unsubscribe>`,
				...headers,
			},
		},
		idempotencyKey ? { idempotencyKey } : undefined
	);

	if (error) {
		throw new Error(`Resend send failed: ${error.message}`);
	}

	return { id: data?.id ?? "" };
}

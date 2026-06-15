import { env } from "@stackk-career/env/server";
import { EngagementNudgeEmail } from "./emails/engagement-nudge";
import { WelcomeEmail } from "./emails/welcome";
import { sendEmail } from "./send";

export interface SendTransactionalInput {
	/** Stable key so task retries collapse into a single delivery. */
	idempotencyKey?: string;
	name: string | null;
	to: string;
}

/** Render + send the post-signup welcome email. CTA links to the web app. */
export function sendWelcomeEmail({ to, name, idempotencyKey }: SendTransactionalInput): Promise<{ id: string }> {
	return sendEmail({
		to,
		subject: "Bienvenido a Assendia",
		react: <WelcomeEmail appUrl={env.CORS_ORIGIN} name={name} />,
		idempotencyKey,
	});
}

/** Render + send the day-after-signup engagement nudge to inactive users. */
export function sendEngagementNudgeEmail({
	to,
	name,
	idempotencyKey,
}: SendTransactionalInput): Promise<{ id: string }> {
	return sendEmail({
		to,
		subject: "Tu primer CV te está esperando en Assendia",
		react: <EngagementNudgeEmail appUrl={env.CORS_ORIGIN} name={name} />,
		idempotencyKey,
	});
}

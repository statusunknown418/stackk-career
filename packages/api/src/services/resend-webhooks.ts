import { env } from "@stackk-career/env/server";
import type { RequestLogger } from "evlog";
import { Resend, type WebhookEventPayload } from "resend";
import { getServerPostHog } from "../lib/posthog";

export type ResendWebhookEvent = WebhookEventPayload;

let resend: Resend | null = null;

/**
 * Lazily-constructed Resend client, used only for {@link Resend.webhooks.verify}
 * (pure HMAC over the raw body — no network call). Deferred so importing this
 * module stays side-effect-free when the API key is absent (e.g. Trigger.dev
 * build-time indexing).
 */
function getResend(): Resend {
	if (!resend) {
		resend = new Resend(env.RESEND_API_KEY);
	}
	return resend;
}

export interface VerifyResendWebhookInput {
	/** Raw, unparsed request body. Re-stringifying breaks the signature. */
	payload: string;
	/** `svix-id` header. */
	svixId: string | null;
	/** `svix-signature` header. */
	svixSignature: string | null;
	/** `svix-timestamp` header. */
	svixTimestamp: string | null;
}

/**
 * Verify a Resend (Svix-signed) webhook against `RESEND_WEBHOOK_SECRET` and
 * return the typed event. Throws on missing headers or an invalid signature, so
 * the route can answer 401 without trusting the payload.
 *
 * @see https://resend.com/docs/webhooks/verify-webhooks-requests
 */
export function verifyResendWebhook({
	payload,
	svixId,
	svixTimestamp,
	svixSignature,
}: VerifyResendWebhookInput): ResendWebhookEvent {
	if (!(svixId && svixTimestamp && svixSignature)) {
		throw new Error("Missing Svix signature headers");
	}
	return getResend().webhooks.verify({
		payload,
		headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
		webhookSecret: env.RESEND_WEBHOOK_SECRET,
	});
}

/**
 * Deliverability-relevant Resend event types → snake_case PostHog event names.
 * Engagement (`email.opened`/`email.clicked`) and lifecycle noise
 * (`email.scheduled`/`email.received`) plus all `contact.*`/`domain.*` events
 * are intentionally absent — they're ignored.
 */
const EVENT_NAMES = {
	"email.sent": "email_sent",
	"email.delivered": "email_delivered",
	"email.delivery_delayed": "email_delivery_delayed",
	"email.bounced": "email_bounced",
	"email.complained": "email_complained",
	"email.suppressed": "email_suppressed",
	"email.failed": "email_failed",
} as const;

type TrackedEvent = Extract<ResendWebhookEvent, { type: keyof typeof EVENT_NAMES }>;

function isTracked(event: ResendWebhookEvent): event is TrackedEvent {
	return event.type in EVENT_NAMES;
}

/**
 * Pull the failure-reason fields off the discriminated event so dashboards can
 * break bounces/suppressions/failures down by cause (`bounce_subtype` etc.).
 */
function reasonProperties(event: TrackedEvent): Record<string, unknown> {
	switch (event.type) {
		case "email.bounced":
			return {
				bounce_type: event.data.bounce.type,
				bounce_subtype: event.data.bounce.subType,
				bounce_message: event.data.bounce.message,
			};
		case "email.suppressed":
			return {
				suppressed_type: event.data.suppressed.type,
				suppressed_message: event.data.suppressed.message,
			};
		case "email.failed":
			return { failure_reason: event.data.failed.reason };
		default:
			return {};
	}
}

export interface ResendEmailCapture {
	/** Recipient address (falls back to the Resend email id when `to` is empty). */
	distinctId: string;
	/** snake_case PostHog event name, e.g. `email_bounced`. */
	event: string;
	properties: Record<string, unknown>;
	/** The event's own occurrence time, so trends bucket by when it happened. */
	timestamp: Date;
}

/**
 * Map a verified Resend event to the PostHog capture we forward, or `null` when
 * the event type isn't deliverability-relevant. Pure (no side effects) so the
 * mapping is unit-testable in isolation from the PostHog client.
 */
export function toResendEmailCapture(event: ResendWebhookEvent): ResendEmailCapture | null {
	if (!isTracked(event)) {
		return null;
	}
	const { data } = event;
	return {
		distinctId: data.to[0] ?? data.email_id,
		event: EVENT_NAMES[event.type],
		timestamp: new Date(event.created_at),
		properties: {
			source: "resend_webhook",
			email_id: data.email_id,
			email_subject: data.subject,
			email_from: data.from,
			recipient: data.to[0] ?? null,
			recipient_count: data.to.length,
			broadcast_id: data.broadcast_id ?? null,
			email_tags: data.tags ?? null,
			...reasonProperties(event),
		},
	};
}

export interface HandleResendWebhookResult {
	event: string;
	outcome: "captured" | "ignored";
}

/**
 * Forward a verified Resend event to PostHog as a server-side capture keyed on
 * the recipient address. Bounces, complaints, and suppressions surface on the
 * "Email deliverability" dashboard section; sent/delivered provide the rate
 * denominator. Untracked event types are a no-op.
 *
 * Capture is wrapped so a PostHog outage never fails the webhook (Resend would
 * otherwise retry). Hard bounces and complaints are auto-added to Resend's own
 * suppression list, so future sends to those addresses are dropped upstream —
 * no local suppression table required.
 */
export function handleResendWebhook(event: ResendWebhookEvent, log?: RequestLogger): HandleResendWebhookResult {
	const capture = toResendEmailCapture(event);
	if (!capture) {
		return { outcome: "ignored", event: event.type };
	}

	try {
		getServerPostHog()?.capture(capture);
	} catch (error) {
		log?.error(error instanceof Error ? error : new Error("posthog_capture_failed"), {
			webhook: { source: "resend", type: event.type },
		});
	}

	return { outcome: "captured", event: capture.event };
}

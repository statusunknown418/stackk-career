import {
	handleResendWebhook,
	type ResendWebhookEvent,
	verifyResendWebhook,
} from "@stackk-career/api/services/resend-webhooks";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestLog } from "@/lib/request-log";

/**
 * Resend webhook receiver. Verifies the Svix signature, then forwards
 * deliverability events (bounced/complained/suppressed, plus sent/delivered for
 * rate context) to PostHog. No body is trusted before {@link verifyResendWebhook}.
 */
async function handle({ request }: { request: Request }): Promise<Response> {
	const log = getRequestLog();
	log.set({ webhook: { source: "resend" } });

	const rawBody = await request.text();

	let event: ResendWebhookEvent;
	try {
		event = verifyResendWebhook({
			payload: rawBody,
			svixId: request.headers.get("svix-id"),
			svixTimestamp: request.headers.get("svix-timestamp"),
			svixSignature: request.headers.get("svix-signature"),
		});
	} catch {
		log.set({ webhook: { rejected: "signature" } });
		return Response.json({ error: "invalid_signature" }, { status: 401 });
	}

	log.set({ webhook: { source: "resend", type: event.type } });

	try {
		const result = handleResendWebhook(event, log);
		return Response.json({ ok: true, ...result });
	} catch (error) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			webhook: { source: "resend", type: event.type },
		});
		return Response.json({ error: "internal_error" }, { status: 500 });
	}
}

export const Route = createFileRoute("/api/webhooks/resend")({
	server: {
		handlers: {
			POST: handle,
		},
	},
});

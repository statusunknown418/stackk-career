import {
	handleMercadopagoWebhook,
	mercadopagoWebhookEnvelopeSchema,
	verifyMercadopagoSignature,
} from "@stackk-career/api/services/mercadopago-webhooks";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestLog } from "@/lib/request-log";

const MP_SIGNATURE_HEADER = "x-signature";
const MP_REQUEST_ID_HEADER = "x-request-id";

async function handle({ request }: { request: Request }): Promise<Response> {
	const log = getRequestLog();
	log.set({ webhook: { source: "mercadopago" } });

	const rawBody = await request.text();
	const signature = request.headers.get(MP_SIGNATURE_HEADER);
	const requestId = request.headers.get(MP_REQUEST_ID_HEADER);

	const url = new URL(request.url);
	const queryDataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

	let parsed: unknown;
	try {
		parsed = rawBody.length > 0 ? JSON.parse(rawBody) : {};
	} catch (error) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			webhook: { source: "mercadopago", stage: "parse" },
		});
		return Response.json({ error: "invalid_payload" }, { status: 400 });
	}

	const envelopeResult = mercadopagoWebhookEnvelopeSchema.safeParse(parsed);
	if (!envelopeResult.success) {
		log.set({ webhook: { rejected: "schema" } });
		return Response.json({ error: "invalid_payload" }, { status: 400 });
	}
	const envelope = envelopeResult.data;

	const dataId = queryDataId ?? (envelope.data?.id ? String(envelope.data.id) : null);

	if (!verifyMercadopagoSignature({ requestId, signature, dataId })) {
		log.set({ webhook: { rejected: "signature" } });
		return Response.json({ error: "invalid_signature" }, { status: 401 });
	}

	log.set({
		webhook: {
			source: "mercadopago",
			type: envelope.type,
			action: envelope.action,
			eventId: envelope.id ? String(envelope.id) : null,
		},
	});

	try {
		const result = await handleMercadopagoWebhook(envelope, rawBody, log);
		return Response.json({ ok: true, ...result });
	} catch (error) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			webhook: { source: "mercadopago", type: envelope.type, action: envelope.action },
		});
		return Response.json({ error: "internal_error" }, { status: 500 });
	}
}

export const Route = createFileRoute("/api/webhooks/mercadopago")({
	server: {
		handlers: {
			POST: handle,
		},
	},
});

import {
	broadcastBookingChange,
	cancelBooking,
	captureBooking,
	lookupBookingOwner,
	parseDate,
	readSlug,
	rescheduleBooking,
	resolveUserId,
	verifySignature,
} from "@stackk-career/api/services/coaching-bookings";
import { type CalWebhookEnvelope, calWebhookEnvelopeSchema } from "@stackk-career/schemas/api/cal-webhooks";
import type { CoachingStage } from "@stackk-career/schemas/api/coaching";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestLog } from "@/lib/request-log";

const CAL_SIGNATURE_HEADER = "x-cal-signature-256";

const SLUG_TO_STAGE: Record<string, CoachingStage> = {
	"impulsa-coaching-fp": "general-coaching",
	"impulsa-coaching-pi": "pre-interview-training",
	"impulsa-coaching-mock": "mock-interview",
	"impulsa-coaching-follow": "follow-up",
};

function resolveStageFromSlug(slug: string): CoachingStage | null {
	return SLUG_TO_STAGE[slug] ?? null;
}

async function handleBookingCreated(envelope: CalWebhookEnvelope): Promise<Response> {
	const log = getRequestLog();
	const { payload } = envelope;

	const userId = await resolveUserId(payload);
	if (!userId) {
		log.set({ webhook: { skipped: "missing_userId", uid: payload.uid } });
		return Response.json({ ok: true, skipped: "missing_userId" });
	}

	const slug = readSlug(payload);
	const stage = slug ? resolveStageFromSlug(slug) : null;
	if (!stage) {
		log.set({ webhook: { skipped: "unknown_slug", slug, uid: payload.uid } });
		return Response.json({ ok: true, skipped: "unknown_slug" });
	}

	await captureBooking(
		{
			bookingStatus: payload.status?.toLowerCase() ?? "confirmed",
			calBookingUid: payload.uid,
			calEventTypeId: payload.eventType?.id ?? payload.eventTypeId ?? null,
			calEventTypeSlug: slug,
			calLink: slug ?? payload.uid,
			endsAt: parseDate(payload.endTime),
			stage,
			startsAt: parseDate(payload.startTime),
			title: payload.title ?? null,
			userId,
			videoCallUrl: payload.videoCallData?.url ?? null,
		},
		log
	);

	await broadcastBookingChange({ action: "created", calBookingUid: payload.uid, stage, userId }, log);

	return Response.json({ ok: true });
}

async function handleBookingRescheduled(envelope: CalWebhookEnvelope): Promise<Response> {
	const log = getRequestLog();
	const { payload } = envelope;

	const found = await rescheduleBooking(
		{
			calBookingUid: payload.uid,
			endsAt: parseDate(payload.endTime),
			priorCalBookingUid: payload.rescheduleUid ?? null,
			startsAt: parseDate(payload.startTime),
			videoCallUrl: payload.videoCallData?.url ?? null,
		},
		log
	);

	if (found) {
		const owner = await lookupBookingOwner(payload.uid);
		if (owner) {
			await broadcastBookingChange(
				{ action: "rescheduled", calBookingUid: payload.uid, stage: owner.stage, userId: owner.userId },
				log
			);
		}
		return Response.json({ ok: true });
	}

	const userId = await resolveUserId(payload);
	const slug = readSlug(payload);
	const stage = slug ? resolveStageFromSlug(slug) : null;

	if (!(userId && stage)) {
		log.set({
			webhook: {
				skipped: "reschedule_unmatchable",
				slug,
				uid: payload.uid,
				userId: userId ?? null,
			},
		});
		return Response.json({ ok: true, skipped: "reschedule_unmatchable" });
	}

	await captureBooking(
		{
			bookingStatus: payload.status?.toLowerCase() ?? "confirmed",
			calBookingUid: payload.uid,
			calEventTypeId: payload.eventType?.id ?? payload.eventTypeId ?? null,
			calEventTypeSlug: slug,
			calLink: slug ?? payload.uid,
			endsAt: parseDate(payload.endTime),
			stage,
			startsAt: parseDate(payload.startTime),
			title: payload.title ?? null,
			userId,
			videoCallUrl: payload.videoCallData?.url ?? null,
		},
		log
	);

	await broadcastBookingChange({ action: "rescheduled", calBookingUid: payload.uid, stage, userId }, log);

	return Response.json({ ok: true, recreated: true });
}

async function handleBookingCancelled(envelope: CalWebhookEnvelope): Promise<Response> {
	const log = getRequestLog();
	const calBookingUid = envelope.payload.uid;

	const owner = await lookupBookingOwner(calBookingUid);

	await cancelBooking(calBookingUid, log);

	if (owner) {
		await broadcastBookingChange({ action: "cancelled", calBookingUid, stage: owner.stage, userId: owner.userId }, log);
	}

	return Response.json({ ok: true });
}

/**
 * @description main handler for cal.com webhooks that syncs their service into OURs
 * @param req
 * @returns
 */
async function handle({ request }: { request: Request }): Promise<Response> {
	const log = getRequestLog();
	log.set({ webhook: { source: "cal" } });

	if (request.method !== "POST") {
		log.set({ webhook: { rejected: "method", method: request.method } });
		return Response.json({ error: "method_not_allowed" }, { status: 405 });
	}

	const rawBody = await request.text();
	const signature = request.headers.get(CAL_SIGNATURE_HEADER);

	if (!verifySignature(rawBody, signature)) {
		log.set({ webhook: { rejected: "signature" } });
		return Response.json({ error: "invalid_signature" }, { status: 401 });
	}

	let envelope: CalWebhookEnvelope;

	try {
		const parsed = JSON.parse(rawBody);
		envelope = calWebhookEnvelopeSchema.parse(parsed);
	} catch (error) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			webhook: { source: "cal", stage: "parse" },
		});
		return Response.json({ error: "invalid_payload" }, { status: 400 });
	}

	log.set({
		webhook: {
			source: "cal",
			triggerEvent: envelope.triggerEvent,
			uid: envelope.payload.uid,
		},
	});

	try {
		switch (envelope.triggerEvent) {
			case "BOOKING_CREATED":
				return await handleBookingCreated(envelope);
			case "BOOKING_RESCHEDULED":
				return await handleBookingRescheduled(envelope);
			case "BOOKING_CANCELLED":
				return await handleBookingCancelled(envelope);
			default:
				log.set({ webhook: { skipped: "unknown_event" } });
				return Response.json({ ok: true, skipped: "unknown_event" });
		}
	} catch (error) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			webhook: { source: "cal", triggerEvent: envelope.triggerEvent, uid: envelope.payload.uid },
		});
		return Response.json({ error: "internal_error" }, { status: 500 });
	}
}

export const Route = createFileRoute("/api/webhooks/cal/$")({
	server: {
		handlers: {
			DELETE: handle,
			GET: handle,
			HEAD: handle,
			PATCH: handle,
			POST: handle,
			PUT: handle,
		},
	},
});

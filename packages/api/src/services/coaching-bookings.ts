import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@stackk-career/db";
import { user } from "@stackk-career/db/schema/auth";
import { type CoachingStage, coachingSessions } from "@stackk-career/db/schema/coaching-sessions";
import { env } from "@stackk-career/env/server";
import type { coachingBookingChangedTask } from "@stackk-career/jobs/trigger/tasks/coaching-booking-changed";
import type { CalBookingPayload } from "@stackk-career/schemas/api/cal-webhooks";
import type { CoachingBookingChangedAction } from "@stackk-career/schemas/jobs/coaching-booking-changed";
import { tasks } from "@trigger.dev/sdk";
import { eq, inArray } from "drizzle-orm";
import type { RequestLogger } from "evlog";
import { invalidateViewerUsage } from "../lib/viewer-cache";

export interface CaptureBookingInput {
	bookingStatus?: string;
	calBookingUid: string;
	calEventTypeId?: number | null;
	calEventTypeSlug?: string | null;
	calLink: string;
	endsAt?: Date | null;
	stage: CoachingStage;
	startsAt?: Date | null;
	title?: string | null;
	userId: string;
	videoCallUrl?: string | null;
}

export async function captureBooking(input: CaptureBookingInput, log?: RequestLogger): Promise<void> {
	const values = {
		bookingStatus: input.bookingStatus ?? "confirmed",
		calBookingUid: input.calBookingUid,
		calEventTypeId: input.calEventTypeId ?? null,
		calEventTypeSlug: input.calEventTypeSlug ?? null,
		calLink: input.calLink,
		endsAt: input.endsAt ?? null,
		stage: input.stage,
		startsAt: input.startsAt ?? null,
		title: input.title ?? null,
		userId: input.userId,
		videoCallUrl: input.videoCallUrl ?? null,
	};

	try {
		await db
			.insert(coachingSessions)
			.values(values)
			.onConflictDoUpdate({
				target: coachingSessions.calBookingUid,
				set: {
					bookingStatus: values.bookingStatus,
					calEventTypeId: values.calEventTypeId,
					calEventTypeSlug: values.calEventTypeSlug,
					calLink: values.calLink,
					endsAt: values.endsAt,
					stage: values.stage,
					startsAt: values.startsAt,
					title: values.title,
					videoCallUrl: values.videoCallUrl,
				},
			});

		await invalidateViewerUsage(db, input.userId, ["coaching_sessions_per_cycle"]);

		log?.set({
			coaching: {
				action: "capture",
				calBookingUid: input.calBookingUid,
				outcome: "success",
				stage: input.stage,
				userId: input.userId,
			},
		});
	} catch (error) {
		log?.error(error instanceof Error ? error : new Error(String(error)), {
			coaching: {
				action: "capture",
				calBookingUid: input.calBookingUid,
				stage: input.stage,
				userId: input.userId,
			},
		});
		throw error;
	}
}

export async function cancelBooking(calBookingUid: string, log?: RequestLogger): Promise<void> {
	const updated = await db
		.update(coachingSessions)
		.set({ bookingStatus: "cancelled" })
		.where(eq(coachingSessions.calBookingUid, calBookingUid))
		.returning({ id: coachingSessions.id });

	log?.set({
		coaching: {
			action: "cancel",
			calBookingUid,
			found: updated.length > 0,
		},
	});
}

interface RescheduleBookingInput {
	calBookingUid: string;
	endsAt?: Date | null;
	priorCalBookingUid?: string | null;
	startsAt?: Date | null;
	videoCallUrl?: string | null;
}

export async function rescheduleBooking(input: RescheduleBookingInput, log?: RequestLogger): Promise<boolean> {
	const lookupUids = [input.calBookingUid];
	if (input.priorCalBookingUid && input.priorCalBookingUid !== input.calBookingUid) {
		lookupUids.push(input.priorCalBookingUid);
	}

	const updates: Record<string, unknown> = {
		bookingStatus: "confirmed",
		calBookingUid: input.calBookingUid,
	};
	if (input.startsAt !== undefined) {
		updates.startsAt = input.startsAt;
	}
	if (input.endsAt !== undefined) {
		updates.endsAt = input.endsAt;
	}
	if (input.videoCallUrl !== undefined) {
		updates.videoCallUrl = input.videoCallUrl;
	}

	const updated = await db
		.update(coachingSessions)
		.set(updates)
		.where(inArray(coachingSessions.calBookingUid, lookupUids))
		.returning({ id: coachingSessions.id });

	const found = updated.length > 0;

	log?.set({
		coaching: {
			action: "reschedule",
			calBookingUid: input.calBookingUid,
			found,
			priorCalBookingUid: input.priorCalBookingUid ?? null,
		},
	});

	return found;
}

export function verifySignature(rawBody: string, signature: string | null): boolean {
	if (!signature) {
		return false;
	}
	const expected = createHmac("sha256", env.CAL_WEBHOOK_SECRET).update(rawBody).digest("hex");
	const expectedBuf = Buffer.from(expected, "hex");
	let providedBuf: Buffer;
	try {
		providedBuf = Buffer.from(signature, "hex");
	} catch {
		return false;
	}
	if (providedBuf.length !== expectedBuf.length) {
		return false;
	}
	return timingSafeEqual(expectedBuf, providedBuf);
}

export function readUserId(payload: CalBookingPayload): string | null {
	const raw = payload.metadata?.userId;
	return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export async function resolveUserId(payload: CalBookingPayload): Promise<string | null> {
	const fromMeta = readUserId(payload);
	if (fromMeta) {
		return fromMeta;
	}
	const email = payload.attendees?.find((a) => a.email)?.email;
	if (!email) {
		return null;
	}
	const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
	return row?.id ?? null;
}

export function readSlug(payload: CalBookingPayload): string | null {
	return payload.eventType?.slug ?? payload.type ?? null;
}

export function parseDate(value: string | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export interface BroadcastBookingChangeInput {
	action: CoachingBookingChangedAction;
	calBookingUid: string;
	stage: CoachingStage;
	userId: string;
}

export async function broadcastBookingChange(input: BroadcastBookingChangeInput, log?: RequestLogger): Promise<void> {
	try {
		await tasks.trigger<typeof coachingBookingChangedTask>("coaching-booking-changed", input, {
			tags: [`user:${input.userId}`, "coaching-changed"],
		});
		log?.set({
			coaching: { action: "broadcast", calBookingUid: input.calBookingUid, outcome: "success" },
		});
	} catch (error) {
		log?.error(error instanceof Error ? error : new Error(String(error)), {
			coaching: { action: "broadcast", calBookingUid: input.calBookingUid },
		});
	}
}

export async function lookupBookingOwner(
	calBookingUid: string
): Promise<{ stage: CoachingStage; userId: string } | null> {
	const [row] = await db
		.select({ stage: coachingSessions.stage, userId: coachingSessions.userId })
		.from(coachingSessions)
		.where(eq(coachingSessions.calBookingUid, calBookingUid))
		.limit(1);
	return row ?? null;
}

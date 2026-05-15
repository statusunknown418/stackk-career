import { z } from "zod";

export const calAttendeeSchema = z.object({
	email: z.string().email().optional(),
	name: z.string().optional(),
});

export const calEventTypeSchema = z
	.object({
		id: z.number().int().optional(),
		slug: z.string().optional(),
	})
	.partial();

export const calVideoCallDataSchema = z
	.object({
		url: z.string().url().optional(),
	})
	.partial();

export const calBookingPayloadSchema = z.object({
	additionalNotes: z.string().optional(),
	attendees: z.array(calAttendeeSchema).optional(),
	endTime: z.string().optional(),
	eventType: calEventTypeSchema.optional(),
	eventTypeId: z.number().int().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	organizer: calAttendeeSchema.optional(),
	rescheduleUid: z.string().optional(),
	startTime: z.string().optional(),
	status: z.string().optional(),
	title: z.string().optional(),
	type: z.string().optional(),
	uid: z.string(),
	videoCallData: calVideoCallDataSchema.optional(),
});

export const calWebhookEnvelopeSchema = z.object({
	createdAt: z.string().optional(),
	payload: calBookingPayloadSchema,
	triggerEvent: z.string(),
});

export type CalBookingPayload = z.infer<typeof calBookingPayloadSchema>;
export type CalWebhookEnvelope = z.infer<typeof calWebhookEnvelopeSchema>;

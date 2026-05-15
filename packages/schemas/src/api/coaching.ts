import { coachingStageEnum } from "@stackk-career/db/schema/coaching-sessions";
import { z } from "zod";
import { insertCoachingSessionSchema, selectCoachingSessionSchema } from "../db/coaching-sessions";

export const coachingStageSchema = z.enum(coachingStageEnum);

export const coachingStepSummarySchema = z.object({
	completed: z.boolean(),
	description: z.string(),
	label: z.string(),
	stage: coachingStageSchema,
});

export const coachingBookingSummarySchema = selectCoachingSessionSchema.pick({
	bookingStatus: true,
	calBookingUid: true,
	calEventTypeId: true,
	calEventTypeSlug: true,
	calLink: true,
	createdAt: true,
	endsAt: true,
	id: true,
	stage: true,
	startsAt: true,
	title: true,
	videoCallUrl: true,
});

export const coachingDashboardSchema = z.object({
	bookings: z.array(coachingBookingSummarySchema),
	completedSteps: z.number().int().min(0).max(coachingStageEnum.length),
	hasResumeAnalysis: z.boolean(),
	recommendedStage: coachingStageSchema,
	resumeCount: z.number().int().min(0),
	steps: z.array(coachingStepSummarySchema),
	viewer: z.object({
		email: z.string().email(),
		name: z.string().min(1),
	}),
});

export const coachingRealtimeTokenSchema = z.object({
	expiresAtMs: z.number().int().positive(),
	token: z.string().min(1),
});

export type CoachingRealtimeToken = z.infer<typeof coachingRealtimeTokenSchema>;

export const captureCoachingBookingInputSchema = insertCoachingSessionSchema
	.pick({
		bookingStatus: true,
		calBookingUid: true,
		calEventTypeId: true,
		calEventTypeSlug: true,
		calLink: true,
		stage: true,
		title: true,
		videoCallUrl: true,
	})
	.extend({
		bookingStatus: z.string().min(1).default("confirmed"),
		endsAt: z.string().datetime().nullable().optional(),
		startsAt: z.string().datetime().nullable().optional(),
		videoCallUrl: z.string().url().nullable().optional(),
	});

export type CaptureCoachingBookingInput = z.infer<typeof captureCoachingBookingInputSchema>;
export type CoachingBookingSummary = z.infer<typeof coachingBookingSummarySchema>;
export type CoachingDashboard = z.infer<typeof coachingDashboardSchema>;
export type CoachingStage = z.infer<typeof coachingStageSchema>;
export type CoachingStepSummary = z.infer<typeof coachingStepSummarySchema>;

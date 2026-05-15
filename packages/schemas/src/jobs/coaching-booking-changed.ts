import { coachingStageEnum } from "@stackk-career/db/schema/coaching-sessions";
import { z } from "zod";

export const coachingBookingChangedActionEnum = ["created", "rescheduled", "cancelled"] as const;

export const coachingBookingChangedInputSchema = z.object({
	action: z.enum(coachingBookingChangedActionEnum),
	calBookingUid: z.string().min(1),
	stage: z.enum(coachingStageEnum),
	userId: z.string().min(1),
});

export type CoachingBookingChangedAction = (typeof coachingBookingChangedActionEnum)[number];
export type CoachingBookingChangedInput = z.infer<typeof coachingBookingChangedInputSchema>;

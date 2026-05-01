import { z } from "zod";
import { insertOnboardingProfileSchema } from "../db/onboarding-profile";

export const onboardingProfileUpsertInputSchema = z
	.object(insertOnboardingProfileSchema.shape)
	.pick({
		experience: true,
		industry: true,
		location: true,
		targetRole: true,
		urgency: true,
	})
	.partial();

export type OnboardingProfileUpsertInput = z.infer<typeof onboardingProfileUpsertInputSchema>;

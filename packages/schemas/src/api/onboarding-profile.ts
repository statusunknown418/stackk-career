import { z } from "zod";

export const onboardingProfileUpsertInputSchema = z
	.object({
		experience: z.string().nullish(),
		industry: z.string().nullish(),
		targetRole: z.string().nullish(),
		urgency: z.string().nullish(),
		location: z.string().nullish(),
	})
	.partial();

export type OnboardingProfileUpsertInput = z.infer<typeof onboardingProfileUpsertInputSchema>;

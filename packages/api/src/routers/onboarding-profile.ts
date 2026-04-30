import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import {
	type OnboardingProfileUpsertInput,
	onboardingProfileUpsertInputSchema,
} from "@stackk-career/schemas/api/onboarding-profile";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

function providedFields(input: OnboardingProfileUpsertInput): string[] {
	return Object.entries(input)
		.filter(([, value]) => value !== undefined && value !== null)
		.map(([key]) => key);
}

export const onboardingProfileRouter = {
	upsert: protectedProcedure.input(onboardingProfileUpsertInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;
		const now = new Date();
		const fields = providedFields(input);

		context.log?.set({
			action: "upsert_onboarding_profile",
			user: { id: userId },
			onboarding: {
				fields,
				fieldCount: fields.length,
			},
		});

		const [row] = await context.db
			.insert(onboardingProfile)
			.values({
				...input,
				userId,
			})
			.onConflictDoUpdate({
				target: onboardingProfile.userId,
				set: {
					...input,
					updatedAt: now,
				},
			})
			.returning();

		context.log?.set({
			outcome: row ? "upserted" : "noop",
		});

		return row ?? null;
	}),

	get: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_onboarding_profile",
			user: { id: userId },
		});

		const [row] = await context.db
			.select()
			.from(onboardingProfile)
			.where(eq(onboardingProfile.userId, userId))
			.limit(1);

		context.log?.set({
			outcome: row ? "found" : "not_found",
		});

		return row ?? null;
	}),
};

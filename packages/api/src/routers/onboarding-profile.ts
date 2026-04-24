import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

const upsertInput = z
	.object({
		experience: z.string().nullish(),
		industry: z.string().nullish(),
		targetRole: z.string().nullish(),
		urgency: z.string().nullish(),
		location: z.string().nullish(),
	})
	.partial();

function providedFields(input: z.infer<typeof upsertInput>): string[] {
	return Object.entries(input)
		.filter(([, value]) => value !== undefined && value !== null)
		.map(([key]) => key);
}

export const onboardingProfileRouter = {
	upsert: protectedProcedure.input(upsertInput).handler(async ({ input, context }) => {
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
				userId,
				experience: input.experience ?? null,
				industry: input.industry ?? null,
				targetRole: input.targetRole ?? null,
				urgency: input.urgency ?? null,
				location: input.location ?? null,
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

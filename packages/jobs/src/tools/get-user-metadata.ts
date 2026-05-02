import { db } from "@stackk-career/db";
import { user } from "@stackk-career/db/schema/auth";
import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function createGetUserMetadataTool(userId: string) {
	return tool({
		description: "Get current user onboarding profile",
		inputSchema: z.object({}),
		execute: async () => {
			const [userData] = await db
				.select()
				.from(user)
				.where(eq(user.id, userId))
				.leftJoin(onboardingProfile, eq(onboardingProfile.userId, userId))
				.limit(1)
				.$withCache();

			if (!userData?.user.id) {
				return {
					error: "No se encontró el usuario requerido",
					data: { userId },
					cause: "NOT_FOUND",
				};
			}

			if (!userData.onboarding_profile?.userId) {
				return {
					error: "No se encontró el perfil del usuario",
					data: { userId },
					cause: "PROFILE_NOT_FOUND",
				};
			}

			return userData;
		},
	});
}

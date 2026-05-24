import { getTriggerDb } from "@stackk-career/db/http";
import { user } from "@stackk-career/db/schema/auth";
import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { eq } from "drizzle-orm";

export interface UserMetadata {
	profile: {
		experience: string | null;
		industry: string | null;
		targetRole: string | null;
		urgency: string | null;
		location: string | null;
	} | null;
	user: { id: string; name: string | null; email: string | null };
}

export async function getUserMetadata(userId: string): Promise<UserMetadata | null> {
	const db = getTriggerDb();

	const [row] = await db
		.select()
		.from(user)
		.where(eq(user.id, userId))
		.leftJoin(onboardingProfile, eq(onboardingProfile.userId, userId))
		.limit(1)
		.$withCache();

	if (!row?.user.id) {
		return null;
	}

	return {
		user: { id: row.user.id, name: row.user.name ?? null, email: row.user.email ?? null },
		profile: row.onboarding_profile
			? {
					experience: row.onboarding_profile.experience ?? null,
					industry: row.onboarding_profile.industry ?? null,
					targetRole: row.onboarding_profile.targetRole ?? null,
					urgency: row.onboarding_profile.urgency ?? null,
					location: row.onboarding_profile.location ?? null,
				}
			: null,
	};
}

export function withTimeout(outer: AbortSignal | undefined, timeoutMs: number): AbortSignal {
	const timeout = AbortSignal.timeout(timeoutMs);
	return outer ? AbortSignal.any([outer, timeout]) : timeout;
}

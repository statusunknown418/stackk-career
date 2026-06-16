import type { TriggerDb } from "@stackk-career/db/http";
import { user } from "@stackk-career/db/schema/auth";
import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { resumes } from "@stackk-career/db/schema/resumes";
import { transactionalEmails } from "@stackk-career/db/schema/transactional-emails";
import { subDays } from "date-fns";
import { and, count, eq, gte, isNull, lte } from "drizzle-orm";

export interface NudgeCandidate {
	email: string;
	name: string | null;
	userId: string;
}

export interface EngagementSignals {
	hasOnboarding: boolean;
	resumeCount: number;
}

/**
 * A user counts as engaged once they've completed onboarding AND created at least
 * one resume (manual or AI). Returning logins alone don't count — every signed-up
 * user logged in at least once. The nudge targets users who are NOT engaged.
 */
export function isUserEngaged({ hasOnboarding, resumeCount }: EngagementSignals): boolean {
	return hasOnboarding && resumeCount > 0;
}

/**
 * Inclusive [from, to] `createdAt` window for the daily nudge: users who signed up
 * 1–2 days before `now`. The 24h-wide band means each signup lands in exactly one
 * daily pass, so nobody is scanned twice.
 */
export function signupNudgeWindow(now: Date): { from: Date; to: Date } {
	return { from: subDays(now, 2), to: subDays(now, 1) };
}

/**
 * Users who signed up 1–2 days ago, are not yet engaged, and have not already
 * been nudged. The "not nudged" filter is the join to `transactional_emails`
 * (type `engagement_nudge`); engagement is evaluated in JS via `isUserEngaged`
 * over the per-user onboarding + resume-count aggregate.
 */
export async function selectUsersForNudge(db: TriggerDb, now: Date): Promise<NudgeCandidate[]> {
	const { from, to } = signupNudgeWindow(now);

	const rows = await db
		.select({
			userId: user.id,
			email: user.email,
			name: user.name,
			onboardingUserId: onboardingProfile.userId,
			resumeCount: count(resumes.id),
		})
		.from(user)
		.leftJoin(onboardingProfile, eq(onboardingProfile.userId, user.id))
		.leftJoin(resumes, eq(resumes.userId, user.id))
		.leftJoin(
			transactionalEmails,
			and(eq(transactionalEmails.userId, user.id), eq(transactionalEmails.type, "engagement_nudge"))
		)
		.where(and(gte(user.createdAt, from), lte(user.createdAt, to), isNull(transactionalEmails.id)))
		.groupBy(user.id);

	return rows
		.filter((row) => !isUserEngaged({ hasOnboarding: row.onboardingUserId != null, resumeCount: row.resumeCount }))
		.map((row) => ({ userId: row.userId, email: row.email, name: row.name }));
}

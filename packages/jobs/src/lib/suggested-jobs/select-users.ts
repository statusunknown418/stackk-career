import type { TriggerDb } from "@stackk-career/db/http";
import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { resumes } from "@stackk-career/db/schema/resumes";
import { userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import { jobSuggestionRuns } from "@stackk-career/db/schema/suggested-jobs";
import {
	getEffectivePlanId,
	JOB_SUGGESTION_CADENCE_DAYS,
	type JobSuggestionCadence,
	jobSuggestionCadenceForPlan,
} from "@stackk-career/schemas/subscriptions";
import { subDays } from "date-fns";
import { and, eq, gte } from "drizzle-orm";

/** One user due for a suggested-jobs run this cycle, with the cadence they qualified under. */
export interface JobSuggestionCandidate {
	cadence: JobSuggestionCadence;
	userId: string;
}

/**
 * Users due for a suggested-jobs compute run at `now`. Eligibility:
 *
 * - MUST have an `onboarding_profile` row AND a primary resume (`resumes.isPrimary`) —
 *   without both there is nothing to search on. Enforced by the inner joins.
 * - pro/max (daily cadence): due every day; the dispatcher's per-day idempotency key
 *   makes a same-day re-dispatch a no-op.
 * - free (monthly cadence): due only when the latest `ready` run completed at least
 *   {@link JOB_SUGGESTION_CADENCE_DAYS.monthly} days ago (or never). Read as an existence
 *   check against the cutoff so the comparison goes through the timestamp column mapper
 *   rather than a raw `max()` aggregate.
 *
 * Plan defaults to `free`/`active` when a user has no `user_subscriptions` row (every
 * signed-up user should have one; the coalesce is defensive). Mirrors the scan+filter
 * shape of {@link selectUsersForNudge}.
 */
export async function selectUsersForJobSuggestions(db: TriggerDb, now: Date): Promise<JobSuggestionCandidate[]> {
	const eligible = await db
		.selectDistinct({
			userId: onboardingProfile.userId,
			planId: userSubscriptions.planId,
			status: userSubscriptions.status,
		})
		.from(onboardingProfile)
		.innerJoin(resumes, and(eq(resumes.userId, onboardingProfile.userId), eq(resumes.isPrimary, true)))
		.leftJoin(userSubscriptions, eq(userSubscriptions.userId, onboardingProfile.userId));

	if (eligible.length === 0) {
		return [];
	}

	// Free users who already had a `ready` run inside the monthly window are not due yet.
	const monthlyCutoff = subDays(now, JOB_SUGGESTION_CADENCE_DAYS.monthly);
	const recentRuns = await db
		.selectDistinct({ userId: jobSuggestionRuns.userId })
		.from(jobSuggestionRuns)
		.where(and(eq(jobSuggestionRuns.status, "ready"), gte(jobSuggestionRuns.completedAt, monthlyCutoff)));
	const ranWithinWindow = new Set(recentRuns.map((row) => row.userId));

	const candidates: JobSuggestionCandidate[] = [];
	for (const row of eligible) {
		const cadence = jobSuggestionCadenceForPlan(
			getEffectivePlanId({ planId: row.planId ?? "free", status: row.status ?? "active" })
		);
		// Daily plans are always due (idempotency dedupes same-day); monthly plans wait out the window.
		if (cadence === "daily" || !ranWithinWindow.has(row.userId)) {
			candidates.push({ cadence, userId: row.userId });
		}
	}

	return candidates;
}

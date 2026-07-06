import { ORPCError } from "@orpc/client";
import { resumes } from "@stackk-career/db/schema/resumes";
import { jobSuggestionRuns, suggestedJobs } from "@stackk-career/db/schema/suggested-jobs";
import type { computeSuggestedJobsTask } from "@stackk-career/jobs/trigger/tasks/suggested-jobs";
import { dismissSuggestedJobInputSchema } from "@stackk-career/schemas/api/suggested-jobs";
import {
	getEffectivePlanId,
	JOB_SUGGESTION_CADENCE_DAYS,
	jobSuggestionCadenceForPlan,
} from "@stackk-career/schemas/subscriptions";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { addDays } from "date-fns";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure } from "..";
import { invalidateSuggestedJobs, suggestedJobsTag } from "../lib/viewer-cache";
import { getActiveSubscriptionForUser } from "../services/subscriptions";

/** Minimum gap between manual refreshes — bounds Apify spend from repeated "Actualizar" taps. */
const REFRESH_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * When the feed next refreshes: the last completed run plus the plan's cadence window.
 * Null until the user's first run completes (the UI then shows a generic "pronto").
 */
function computeNextRefreshAt(lastCompletedAt: Date | null, cadenceDays: number): Date | null {
	return lastCompletedAt ? addDays(lastCompletedAt, cadenceDays) : null;
}

export const suggestedJobsRouter = {
	/**
	 * The user's `ready` suggestions (best match first), plus latest-run meta and the computed
	 * next-refresh time for the "próxima actualización" hint. Cached under the per-user feed tag;
	 * busted by the compute task and the dismiss/refresh mutations.
	 */
	list: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		context.log?.set({ action: "list_suggested_jobs", user: { id: userId } });

		const jobs = await context.db
			.select({
				id: suggestedJobs.id,
				source: suggestedJobs.source,
				url: suggestedJobs.url,
				title: suggestedJobs.title,
				company: suggestedJobs.company,
				location: suggestedJobs.location,
				employmentType: suggestedJobs.employmentType,
				seniority: suggestedJobs.seniority,
				postedAt: suggestedJobs.postedAt,
				matchScore: suggestedJobs.matchScore,
				matchReasons: suggestedJobs.matchReasons,
				createdAt: suggestedJobs.createdAt,
			})
			.from(suggestedJobs)
			.where(and(eq(suggestedJobs.userId, userId), eq(suggestedJobs.status, "ready")))
			.orderBy(desc(suggestedJobs.matchScore), desc(suggestedJobs.createdAt))
			.$withCache({ tag: suggestedJobsTag(userId) });

		const [latestRun] = await context.db
			.select({ status: jobSuggestionRuns.status, completedAt: jobSuggestionRuns.completedAt })
			.from(jobSuggestionRuns)
			.where(eq(jobSuggestionRuns.userId, userId))
			.orderBy(desc(jobSuggestionRuns.createdAt))
			.limit(1);

		// Next-refresh tracks the last *ready* run (matches the dispatcher's monthly due-check),
		// not the latest row — a later failed/pending run must not reset a free user's clock.
		const [lastReadyRun] = await context.db
			.select({ completedAt: jobSuggestionRuns.completedAt })
			.from(jobSuggestionRuns)
			.where(and(eq(jobSuggestionRuns.userId, userId), eq(jobSuggestionRuns.status, "ready")))
			.orderBy(desc(jobSuggestionRuns.completedAt))
			.limit(1);

		const subscription = await getActiveSubscriptionForUser(context.db, userId);
		const cadence = jobSuggestionCadenceForPlan(getEffectivePlanId(subscription));
		const nextRefreshAt = computeNextRefreshAt(lastReadyRun?.completedAt ?? null, JOB_SUGGESTION_CADENCE_DAYS[cadence]);

		return {
			jobs,
			cadence,
			nextRefreshAt,
			run: latestRun ? { status: latestRun.status, completedAt: latestRun.completedAt } : null,
		};
	}),

	/**
	 * Permanently dismiss a suggestion. Ownership is enforced; the row flips to `dismissed`
	 * (so the compute task excludes it from every future run) and the feed cache is busted.
	 */
	dismiss: protectedProcedure.input(dismissSuggestedJobInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;
		context.log?.set({ action: "dismiss_suggested_job", suggestedJob: { id: input.id }, user: { id: userId } });

		const [row] = await context.db
			.update(suggestedJobs)
			.set({ status: "dismissed" })
			.where(and(eq(suggestedJobs.id, input.id), eq(suggestedJobs.userId, userId)))
			.returning({ id: suggestedJobs.id });

		if (!row) {
			context.log?.set({ outcome: "not_found" });
			throw new ORPCError("NOT_FOUND", { message: "Vacante no encontrada" });
		}

		await invalidateSuggestedJobs(context.db, userId);
		return { id: row.id, dismissed: true as const };
	}),

	/**
	 * Manual "Actualizar ahora" — available to every plan, one at a time. Paid plans are bounded
	 * by a short cooldown; free plans may only pull their run once the monthly window has elapsed
	 * (the same door the dispatcher opens, so it adds no extra Apify spend). Creates a `pending`
	 * run and triggers the compute task with a per-run idempotency key that dedupes retries.
	 */
	refreshNow: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		context.log?.set({ action: "refresh_suggested_jobs", user: { id: userId } });

		const subscription = await getActiveSubscriptionForUser(context.db, userId);
		const cadence = jobSuggestionCadenceForPlan(getEffectivePlanId(subscription));

		const [primary] = await context.db
			.select({ id: resumes.id })
			.from(resumes)
			.where(and(eq(resumes.userId, userId), eq(resumes.isPrimary, true)))
			.limit(1);

		if (!primary) {
			context.log?.set({ outcome: "missing_primary_resume" });
			throw new ORPCError("BAD_REQUEST", { message: "Necesitas un CV principal para buscar vacantes." });
		}

		const [latestRun] = await context.db
			.select({ status: jobSuggestionRuns.status, createdAt: jobSuggestionRuns.createdAt })
			.from(jobSuggestionRuns)
			.where(eq(jobSuggestionRuns.userId, userId))
			.orderBy(desc(jobSuggestionRuns.createdAt))
			.limit(1);

		if (latestRun && (latestRun.status === "pending" || latestRun.status === "running")) {
			context.log?.set({ outcome: "already_running" });
			throw new ORPCError("BAD_REQUEST", { message: "Ya hay una actualización en curso." });
		}

		if (latestRun && Date.now() - latestRun.createdAt.getTime() < REFRESH_COOLDOWN_MS) {
			context.log?.set({ outcome: "cooldown" });
			throw new ORPCError("BAD_REQUEST", { message: "Podrás actualizar de nuevo en un rato." });
		}

		// Free plans pull on-demand only once the monthly window has elapsed since their last ready
		// run — the same door the dispatcher opens, so a manual refresh adds no extra Apify spend.
		if (cadence !== "daily") {
			const [lastReadyRun] = await context.db
				.select({ completedAt: jobSuggestionRuns.completedAt })
				.from(jobSuggestionRuns)
				.where(and(eq(jobSuggestionRuns.userId, userId), eq(jobSuggestionRuns.status, "ready")))
				.orderBy(desc(jobSuggestionRuns.completedAt))
				.limit(1);

			const nextRefreshAt = computeNextRefreshAt(
				lastReadyRun?.completedAt ?? null,
				JOB_SUGGESTION_CADENCE_DAYS[cadence]
			);

			if (nextRefreshAt && Date.now() < nextRefreshAt.getTime()) {
				context.log?.set({ outcome: "not_due" });
				throw new ORPCError("BAD_REQUEST", {
					message: "Tu próxima actualización llegará pronto. Mejora a Pro o Max para actualizarla cuando quieras.",
				});
			}
		}

		const [run] = await context.db
			.insert(jobSuggestionRuns)
			.values({ userId, cadence })
			.returning({ id: jobSuggestionRuns.id });
		if (!run) {
			context.log?.set({ outcome: "run_insert_failed" });
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No pudimos iniciar la actualización." });
		}

		const idempotencyKey = await idempotencyKeys.create(`suggest-refresh:${run.id}`);
		await tasks.trigger<typeof computeSuggestedJobsTask>(
			"compute-suggested-jobs",
			{ userId, runId: run.id, cadence },
			{
				concurrencyKey: userId,
				idempotencyKey,
				idempotencyKeyTTL: "24h",
				tags: [`user:${userId}`, "suggested-jobs", "source:manual-refresh"],
			}
		);

		return { runId: run.id, status: "pending" as const };
	}),
};

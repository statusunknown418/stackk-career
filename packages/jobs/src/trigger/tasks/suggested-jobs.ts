/**
 * Suggested-jobs tasks.
 *
 * `computeSuggestedJobsTask` — one background run per user per cadence cycle:
 *   loading (context) → fetching (provider search) → normalizing (dedup + drop
 *   dismissed) → ranking (native pre-rank + optional LLM refine) → persisting
 *   (upsert `suggested_jobs`, expire stale, mark run ready, bust cache).
 *
 * `suggestedJobsDispatchScheduleTask` — daily scan that fans out one compute run
 *   per due user (see {@link selectUsersForJobSuggestions}).
 *
 * Failure is non-fatal and isolated (same posture as `linkedin-job-fetch`): a
 * per-user run failing marks its `job_suggestion_runs` row `failed` via `onFailure`
 * and never blocks other users; previously `ready` suggestions stay visible.
 */
import { getTriggerDb, type TriggerDb } from "@stackk-career/db/http";
import { userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import { jobSuggestionRuns, suggestedJobs } from "@stackk-career/db/schema/suggested-jobs";
import {
	computeSuggestedJobsInputSchema,
	type JobListing,
	type JobQuery,
	type JobSourceId,
	type RankedJob,
	suggestedJobsTag,
} from "@stackk-career/schemas/jobs/job-discovery";
import { getEffectiveEntitlements, isUnlimited } from "@stackk-career/schemas/subscriptions";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { AbortTaskRunError, idempotencyKeys, logger, metadata, schedules, schemaTask } from "@trigger.dev/sdk";
import { and, eq, ne } from "drizzle-orm";
import { type RankSuggestedJobsCandidate, rankSuggestedJobs } from "../../agents/job-suggestion-ranker.handler";
import { enabledSources } from "../../lib/job-sources/registry";
import { JobSourceConfigError, type SourcedListing } from "../../lib/job-sources/types";
import { buildJobQuery, userSpeaksEnglish } from "../../lib/suggested-jobs/build-query";
import { loadSuggestedJobsContext, type SuggestedJobsContext } from "../../lib/suggested-jobs/load-context";
import { selectUsersForJobSuggestions } from "../../lib/suggested-jobs/select-users";
import { suggestedJobsQueue } from "../queues";

/** Truncate persisted error text, matching `linkedin-job-fetch`'s ledger discipline. */
const ERROR_MESSAGE_LIMIT = 500;
/** Absolute ceiling on surfaced rows per run — more is noise (plan §0.4). Plan caps clamp under this. */
const HARD_RESULT_CEILING = 50;
/** Ship pure-native (zero tokens) when set — the LLM refine pass is skipped, native score stands. */
const SKIP_LLM = process.env.SUGGESTED_JOBS_SKIP_LLM === "1";
/** How many of the provider's matched keywords seed the fallback (no-LLM) reason line. */
const NATIVE_REASON_KEYWORDS = 3;

/** A normalized listing plus the source that produced it — the dedup key is `source` + `sourceJobId`. */
interface FetchedListing {
	item: SourcedListing;
	source: JobSourceId;
}

/** Per-run surfaced cap = the plan's `suggested_jobs_per_run`, clamped to the hard ceiling. */
function resolvePerRunCap(limit: number | "unlimited"): number {
	return Math.min(isUnlimited(limit) ? HARD_RESULT_CEILING : limit, HARD_RESULT_CEILING);
}

/**
 * Fallback reason line when the LLM refine pass is skipped or fails. `listing.skills`
 * carries the provider's matched keywords (see `mapLinkedinItem`), so the top few are
 * the honest "why this matched" signal.
 */
function deriveNativeReasons(listing: JobListing): string[] {
	const matched = listing.skills.slice(0, NATIVE_REASON_KEYWORDS);
	return matched.length > 0 ? [`Coincide con: ${matched.join(", ")}`] : [];
}

/**
 * Search every enabled source. A config error (missing token/actor) can't be fixed by
 * retrying — surface it as a non-retryable abort so `onFailure` records it once; any other
 * (transient) error propagates so Trigger retries the run.
 */
async function fetchAllSources(query: JobQuery, signal: AbortSignal | undefined): Promise<FetchedListing[]> {
	const fetched: FetchedListing[] = [];
	for (const source of enabledSources) {
		try {
			const results = await source.search(query, signal);
			for (const item of results) {
				fetched.push({ item, source: source.id });
			}
		} catch (err) {
			if (err instanceof JobSourceConfigError) {
				throw new AbortTaskRunError(err.message);
			}
			throw err;
		}
	}
	return fetched;
}

/** The user's already-dismissed `source:sourceJobId` keys, so a rejected listing never resurfaces. */
async function loadDismissedKeys(db: TriggerDb, userId: string): Promise<Set<string>> {
	const rows = await db
		.select({ source: suggestedJobs.source, sourceJobId: suggestedJobs.sourceJobId })
		.from(suggestedJobs)
		.where(and(eq(suggestedJobs.userId, userId), eq(suggestedJobs.status, "dismissed")));
	return new Set(rows.map((row) => `${row.source}:${row.sourceJobId}`));
}

/** The user's per-run cap from their effective plan entitlements. */
async function resolveUserCap(db: TriggerDb, userId: string): Promise<number> {
	const [subscription] = await db
		.select({ planId: userSubscriptions.planId, status: userSubscriptions.status })
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);
	return resolvePerRunCap(
		getEffectiveEntitlements({
			planId: subscription?.planId ?? "free",
			status: subscription?.status ?? "active",
		}).suggested_jobs_per_run
	);
}

/**
 * Drop provider-filtered rows and dismissed listings, dedupe on (source, sourceJobId) keeping
 * the best native score, native-pre-rank, then cut to the plan's cap.
 */
function selectSurvivors(fetched: FetchedListing[], dismissedKeys: Set<string>, cap: number): FetchedListing[] {
	const byKey = new Map<string, FetchedListing>();
	for (const entry of fetched) {
		if (!entry.item.dynamicFilterMatch) {
			continue;
		}
		const key = `${entry.source}:${entry.item.listing.sourceJobId}`;
		if (dismissedKeys.has(key)) {
			continue;
		}
		const existing = byKey.get(key);
		if (!existing || (entry.item.nativeScore ?? -1) > (existing.item.nativeScore ?? -1)) {
			byKey.set(key, entry);
		}
	}
	return [...byKey.values()].sort((a, b) => (b.item.nativeScore ?? 0) - (a.item.nativeScore ?? 0)).slice(0, cap);
}

/**
 * Optional bounded LLM refine over the survivors only, keyed by `sourceJobId`. Non-fatal: on
 * failure (or when `SKIP_LLM` is set) it returns an empty map and the caller keeps native scores,
 * rather than sinking the whole run — a feed is better than nothing.
 */
async function refineScores(
	survivors: FetchedListing[],
	query: JobQuery,
	loaded: SuggestedJobsContext,
	userId: string,
	signal: AbortSignal | undefined
): Promise<Map<string, RankedJob>> {
	const verdictByJobId = new Map<string, RankedJob>();
	if (SKIP_LLM || survivors.length === 0) {
		return verdictByJobId;
	}

	const candidate: RankSuggestedJobsCandidate = {
		keywords: query.keywords,
		languages: query.languages,
		location: query.location,
		seniority: query.seniority,
		skills: loaded.resume?.skills ?? [],
		speaksEnglish: userSpeaksEnglish(loaded.profile?.languages ?? null),
	};

	try {
		const verdicts = await rankSuggestedJobs({
			candidate,
			listings: survivors.map((entry) => entry.item.listing),
			signal,
			userId,
		});

		for (const verdict of verdicts) {
			verdictByJobId.set(verdict.sourceJobId, verdict);
		}
	} catch (err) {
		logger.warn("compute-suggested-jobs ranker failed; using native scores", {
			userId,
			error: toError(err).message,
		});
	}
	return verdictByJobId;
}

/** The persisted row for one survivor — LLM verdict when present, native score/keywords otherwise. */
function toSuggestionRow(
	userId: string,
	runId: string,
	entry: FetchedListing,
	verdict: RankedJob | undefined
): typeof suggestedJobs.$inferInsert {
	const listing = entry.item.listing;
	return {
		userId,
		runId,
		source: entry.source,
		sourceJobId: listing.sourceJobId,
		url: listing.url,
		title: listing.title,
		company: listing.company,
		location: listing.location,
		employmentType: listing.employmentType,
		seniority: listing.seniority,
		postedAt: listing.postedAt ? new Date(listing.postedAt) : null,
		matchScore: verdict?.matchScore ?? Math.round(entry.item.nativeScore ?? 0),
		matchReasons: verdict?.reasons ?? deriveNativeReasons(listing),
		structured: listing,
		status: "ready",
	};
}

/**
 * Upsert the survivors (refreshing score/reasons on the unique key), then expire the prior run's
 * leftovers — any row still `ready` from an earlier run that this run did not refresh. Dismissed
 * rows are never touched. A run with no survivors leaves the existing feed intact.
 */
async function persistSurvivors(
	db: TriggerDb,
	userId: string,
	runId: string,
	survivors: FetchedListing[],
	verdictByJobId: Map<string, RankedJob>,
	now: Date
): Promise<void> {
	if (survivors.length === 0) {
		return;
	}

	await Promise.all(
		survivors.map((entry) => {
			const values = toSuggestionRow(userId, runId, entry, verdictByJobId.get(entry.item.listing.sourceJobId));
			return db
				.insert(suggestedJobs)
				.values(values)
				.onConflictDoUpdate({
					target: [suggestedJobs.userId, suggestedJobs.source, suggestedJobs.sourceJobId],
					set: {
						runId: values.runId,
						url: values.url,
						title: values.title,
						company: values.company,
						location: values.location,
						employmentType: values.employmentType,
						seniority: values.seniority,
						postedAt: values.postedAt,
						matchScore: values.matchScore,
						matchReasons: values.matchReasons,
						structured: values.structured,
						status: values.status,
						updatedAt: now,
					},
				});
		})
	);

	await db
		.update(suggestedJobs)
		.set({ status: "expired", updatedAt: now })
		.where(and(eq(suggestedJobs.userId, userId), eq(suggestedJobs.status, "ready"), ne(suggestedJobs.runId, runId)));
}

export const computeSuggestedJobsTask = schemaTask({
	id: "compute-suggested-jobs",
	queue: suggestedJobsQueue,
	schema: computeSuggestedJobsInputSchema,
	maxDuration: 360,
	retry: {
		maxAttempts: 3,
		factor: 2,
		minTimeoutInMs: 2000,
		maxTimeoutInMs: 30_000,
	},
	run: async ({ userId, runId, cadence }, { ctx, signal }) => {
		const db = getTriggerDb();
		logger.info("compute-suggested-jobs = start", { userId, runId, cadence, attempt: ctx.attempt.number });

		metadata.set("step", "loading");
		await db
			.update(jobSuggestionRuns)
			.set({ status: "running", startedAt: new Date() })
			.where(eq(jobSuggestionRuns.id, runId));
		const loaded = await loadSuggestedJobsContext(userId);
		const query = buildJobQuery({ profile: loaded.profile, resume: loaded.resume, letters: loaded.letters, cadence });

		metadata.set("step", "fetching");
		const fetched = await fetchAllSources(query, signal);

		metadata.set("step", "normalizing");
		const [dismissedKeys, cap] = await Promise.all([loadDismissedKeys(db, userId), resolveUserCap(db, userId)]);
		const survivors = selectSurvivors(fetched, dismissedKeys, cap);

		metadata.set("step", "ranking");
		const verdictByJobId = await refineScores(survivors, query, loaded, userId, signal);

		metadata.set("step", "persisting");
		const now = new Date();
		await persistSurvivors(db, userId, runId, survivors, verdictByJobId, now);
		await db
			.update(jobSuggestionRuns)
			.set({ status: "ready", fetchedCount: fetched.length, keptCount: survivors.length, completedAt: now })
			.where(eq(jobSuggestionRuns.id, runId));
		await db.$cache.invalidate({ tags: [suggestedJobsTag(userId)] });

		metadata.set("step", "complete");
		logger.info("compute-suggested-jobs = completed", {
			userId,
			runId,
			fetchedCount: fetched.length,
			keptCount: survivors.length,
		});
		return { runId, fetchedCount: fetched.length, keptCount: survivors.length };
	},

	onFailure: async ({ payload, error }) => {
		const db = getTriggerDb();
		const message = toError(error).message.slice(0, ERROR_MESSAGE_LIMIT);
		await db
			.update(jobSuggestionRuns)
			.set({ status: "failed", error: message, completedAt: new Date() })
			.where(eq(jobSuggestionRuns.id, payload.runId));
	},
});

export const suggestedJobsDispatchScheduleTask = schedules.task({
	id: "suggested-jobs-dispatch",
	cron: { pattern: "0 8 * * *", timezone: "America/Lima" },
	run: async () => {
		const db = getTriggerDb();
		const now = new Date();
		const candidates = await selectUsersForJobSuggestions(db, now);

		logger.info("suggested-jobs-dispatch scan", { candidates: candidates.length });
		if (candidates.length === 0) {
			return { triggered: 0 };
		}

		// One `pending` run row per due user; the compute task advances it as it progresses.
		const runs = await db
			.insert(jobSuggestionRuns)
			.values(candidates.map((candidate) => ({ userId: candidate.userId, cadence: candidate.cadence })))
			.returning({ id: jobSuggestionRuns.id, userId: jobSuggestionRuns.userId });
		const runIdByUser = new Map(runs.map((run) => [run.userId, run.id]));

		// Per-day idempotency key makes a same-day re-dispatch a no-op (self-heals missed days).
		const isoDate = now.toISOString().slice(0, 10);
		const items = await Promise.all(
			candidates.map(async (candidate) => ({
				payload: {
					userId: candidate.userId,
					runId: runIdByUser.get(candidate.userId) ?? "",
					cadence: candidate.cadence,
				},
				options: {
					tags: [`user:${candidate.userId}`, "suggested-jobs"],
					concurrencyKey: candidate.userId,
					idempotencyKey: await idempotencyKeys.create(`suggest:${candidate.userId}:${isoDate}`),
					idempotencyKeyTTL: "24h",
				},
			}))
		);

		await computeSuggestedJobsTask.batchTrigger(items);

		return { triggered: candidates.length };
	},
});

import type { db } from "@stackk-career/db";
import { type CachedUsageLimitKey, cachedUsageLimitKeys } from "@stackk-career/schemas/subscriptions";

/**
 * Build the Drizzle cache tag for a specific user's usage counter.
 *
 * @description Use this when you need to **read** or **invalidate** a single cached counter by name.
 * Read side already uses it inside `viewer.ts` via `.$withCache({ tag: viewerUsageTag(...) })`.
 * Most write paths should call {@link invalidateViewerUsage} instead of touching this helper directly.
 *
 * @example
 * await db.select({ value: count() }).from(resumes)
 *   .where(eq(resumes.userId, userId))
 *   .$withCache({ tag: viewerUsageTag(userId, "resumes_total"), config: { ex: 300 } });
 */
export function viewerUsageTag(userId: string, metric: CachedUsageLimitKey): string {
	return `viewer:usage:${userId}:${metric}`;
}

/**
 * Build the Drizzle cache tag for a specific user's subscription row.
 *
 * @description Use this when you need to **read** or **invalidate** the cached `user_subscriptions` row.
 * Most subscription mutations should call {@link invalidateViewerSubscription} instead, since renewing
 * or switching plans also requires busting every usage tag (the cycle window changes).
 */
export function viewerSubscriptionTag(userId: string): string {
	return `viewer:subscription:${userId}`;
}

/**
 * Invalidate one or more cached usage counters for a single user.
 *
 * @description Call this **after** any drizzle write that changes the row count a viewer counter is
 * derived from. Pass only the metrics whose underlying table you just mutated — invalidation is
 * per-user, so other users' caches stay warm.
 *
 * When to call:
 * - `generations.create` with `type: "resume-creation"` → `["resume_creation_generations_per_cycle"]`
 * - `generations.create` with `type: "conversation"` → `["conversation_generations_per_cycle"]`
 * - `resumes.create` (also inserts a generation) → `["resumes_total", "resume_creation_generations_per_cycle"]`
 * - `resumeAnalyses` insert → `["resume_analyses_per_cycle"]`
 * - `coachingSessions` insert (e.g. `captureBooking`) → `["coaching_sessions_per_cycle"]`
 *
 * Skip this for **updates that don't change row count** (e.g. renaming a resume, updating
 * `bookingStatus` on an existing coaching row). Skip it for deletes only if you're sure the row
 * was never counted in the cached window.
 *
 * Safe to call with `metrics: []` — no-ops without hitting Redis.
 *
 * @param dbClient - the drizzle client that owns the same `$cache` instance the reads were cached against
 * @param userId - the owning user; mutations on other users' rows must not call this with this user's id
 * @param metrics - the subset of counters whose underlying table you just mutated
 */
export async function invalidateViewerUsage(
	dbClient: typeof db,
	userId: string,
	metrics: CachedUsageLimitKey[]
): Promise<void> {
	if (metrics.length === 0) {
		return;
	}

	await dbClient.$cache.invalidate({
		tags: metrics.map((metric) => viewerUsageTag(userId, metric)),
	});
}

/**
 * Invalidate the cached subscription row **and every usage counter** for a single user.
 *
 * @description Call this whenever the subscription itself changes: plan upgrade/downgrade, status
 * transition (`active` → `past_due` / `canceled` / `expired`), or — most importantly — billing
 * period rollover. Because every usage counter's SQL is bounded by `currentPeriodStart` /
 * `currentPeriodEnd`, any cached count from the prior cycle becomes stale the moment those dates
 * move, so they must be wiped alongside the subscription row.
 *
 * When to call:
 * - subscription bootstrap on signup (creates the `free` row) — optional; cache is empty anyway
 * - Mercado Pago webhook: `subscription created`, `payment approved`, `payment failed`,
 *   `canceled`, `expired`, `renewal period rollover`
 * - manual admin overrides that mutate `user_subscriptions` for a user
 * - cycle rollover cron / scheduled task
 *
 * Do **not** call this from per-action mutation routes (resume creation, generation creation,
 * etc.) — use {@link invalidateViewerUsage} with the specific metric instead, otherwise you blow
 * away the entire user's cache on every write.
 *
 * @param dbClient - the drizzle client that owns the same `$cache` instance the reads were cached against
 * @param userId - the user whose subscription row was mutated
 */
export async function invalidateViewerSubscription(dbClient: typeof db, userId: string): Promise<void> {
	await dbClient.$cache.invalidate({
		tags: [viewerSubscriptionTag(userId), ...cachedUsageLimitKeys.map((metric) => viewerUsageTag(userId, metric))],
	});
}

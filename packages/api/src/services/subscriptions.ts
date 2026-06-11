import { ORPCError } from "@orpc/server";
import type { db as dbClient } from "@stackk-career/db";
import { coachingSessions } from "@stackk-career/db/schema/coaching-sessions";
import { generations } from "@stackk-career/db/schema/generations";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumes } from "@stackk-career/db/schema/resumes";
import { userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import {
	type BillingPeriod,
	type CachedUsageLimitKey,
	type EntitlementMap,
	getEffectiveEntitlements,
	getEffectivePlanId,
	hasQuotaRemaining,
	isUnlimited,
	type LimitKey,
	type LimitValue,
	PLAN_CATALOG,
	type PlanId,
	type QuotaErrorPayload,
	remainingQuota,
	type SubscriptionProvider,
	type SubscriptionStatus,
	type Unlimited,
	type UsageSnapshot,
	viewerUsageTag,
} from "@stackk-career/schemas/subscriptions";
import { and, between, count, eq, ne } from "drizzle-orm";
import { invalidateViewerSubscription, viewerSubscriptionTag } from "../lib/viewer-cache";

const CACHE_TTL_SECONDS = 300;

export type Database = typeof dbClient;
export type SubscriptionRow = typeof userSubscriptions.$inferSelect;

export interface UsageSnapshotResult {
	effectivePlan: {
		id: PlanId;
		displayName: string;
	};
	entitlements: EntitlementMap;
	plan: {
		id: PlanId;
		displayName: string;
	};
	remaining: Record<keyof UsageSnapshot, LimitValue | Unlimited | number>;
	subscription: {
		id: string;
		planId: PlanId;
		status: SubscriptionStatus;
		provider: SubscriptionProvider;
		currentPeriodStart: Date;
		currentPeriodEnd: Date;
	};
	usage: UsageSnapshot;
}

export interface AssertQuotaContext {
	/** Required when checking `messages_per_generation`. */
	generationId?: string;
}

/**
 * Fetch the single `user_subscriptions` row for a user with cache-first reads.
 * @throws `ORPCError("INTERNAL_SERVER_ERROR")` if no row exists — every signed-up user must
 * have a `free` row from signup.
 */
export async function getActiveSubscriptionForUser(db: Database, userId: string): Promise<SubscriptionRow> {
	const [row] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1)
		.$withCache({ tag: viewerSubscriptionTag(userId), config: { ex: CACHE_TTL_SECONDS } });

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "El usuario no tiene una suscripción activa" });
	}
	return row;
}

function periodFromSubscription(subscription: SubscriptionRow): BillingPeriod {
	return {
		currentPeriodStart: subscription.currentPeriodStart,
		currentPeriodEnd: subscription.currentPeriodEnd,
	};
}

/**
 * Read one cached per-user counter. Counters are bounded by the subscription's billing window
 * except `resumes_total`, which is all-time.
 *
 * Excludes rows that should not consume quota:
 * - `resume_analyses_per_cycle` skips `status = "failed"` analyses
 * - `coaching_sessions_per_cycle` skips `bookingStatus = "cancelled"` rows
 */
async function readCachedUsageCounter(
	db: Database,
	userId: string,
	metric: CachedUsageLimitKey,
	period: BillingPeriod
): Promise<number> {
	const tag = viewerUsageTag(userId, metric);
	const cacheConfig = { tag, config: { ex: CACHE_TTL_SECONDS } };
	const { currentPeriodStart, currentPeriodEnd } = period;

	if (metric === "resumes_total") {
		const [rows] = await db
			.select({ value: count() })
			.from(resumes)
			.where(eq(resumes.userId, userId))
			.$withCache(cacheConfig);

		return rows?.value ?? 0;
	}

	if (metric === "resume_creation_generations_per_cycle") {
		const [rows] = await db
			.select({ value: count() })
			.from(generations)
			.where(
				and(
					eq(generations.owner, userId),
					eq(generations.type, "resume-creation"),
					between(generations.createdAt, currentPeriodStart, currentPeriodEnd)
				)
			)
			.$withCache(cacheConfig);

		return rows?.value ?? 0;
	}

	if (metric === "conversation_generations_per_cycle") {
		const [rows] = await db
			.select({ value: count() })
			.from(generations)
			.where(
				and(
					eq(generations.owner, userId),
					eq(generations.type, "conversation"),
					between(generations.createdAt, currentPeriodStart, currentPeriodEnd)
				)
			)
			.$withCache(cacheConfig);

		return rows?.value ?? 0;
	}

	if (metric === "resume_analyses_per_cycle") {
		const [rows] = await db
			.select({ value: count() })
			.from(resumeAnalyses)
			.where(
				and(
					eq(resumeAnalyses.userId, userId),
					ne(resumeAnalyses.status, "failed"),
					between(resumeAnalyses.createdAt, currentPeriodStart, currentPeriodEnd)
				)
			)
			.$withCache(cacheConfig);

		return rows?.value ?? 0;
	}

	if (metric === "coaching_sessions_per_cycle") {
		const [rows] = await db
			.select({ value: count() })
			.from(coachingSessions)
			.where(
				and(
					eq(coachingSessions.userId, userId),
					ne(coachingSessions.bookingStatus, "cancelled"),
					between(coachingSessions.createdAt, currentPeriodStart, currentPeriodEnd)
				)
			)
			.$withCache(cacheConfig);

		return rows?.value ?? 0;
	}

	if (metric === "resume_inline_ai_suggestions") {
		const [rows] = await db
			.select({ value: count() })
			.from(messages)
			.innerJoin(generations, eq(messages.generationId, generations.id))
			.where(
				and(
					eq(generations.owner, userId),
					eq(messages.objectType, "resume-suggestion"),
					eq(messages.isAssistant, false),
					between(messages.createdAt, currentPeriodStart, currentPeriodEnd)
				)
			)
			.$withCache(cacheConfig);

		return rows?.value ?? 0;
	}

	return 0;
}

/**
 * Compose the full subscription + usage snapshot for a user, cache-first. Repeated calls within
 * the TTL hit Redis only.
 */
export async function getUsageSnapshot(db: Database, userId: string): Promise<UsageSnapshotResult> {
	const subscription = await getActiveSubscriptionForUser(db, userId);
	const period = periodFromSubscription(subscription);
	const entitlements = getEffectiveEntitlements(subscription);
	const plan = PLAN_CATALOG[subscription.planId];
	const effectivePlan = PLAN_CATALOG[getEffectivePlanId(subscription)];

	const [resumeCreationGens, conversationGens, analyses, coaching, totalResumes, inlineSuggestions] =
		await Promise.allSettled([
			readCachedUsageCounter(db, userId, "resume_creation_generations_per_cycle", period),
			readCachedUsageCounter(db, userId, "conversation_generations_per_cycle", period),
			readCachedUsageCounter(db, userId, "resume_analyses_per_cycle", period),
			readCachedUsageCounter(db, userId, "coaching_sessions_per_cycle", period),
			readCachedUsageCounter(db, userId, "resumes_total", period),
			readCachedUsageCounter(db, userId, "resume_inline_ai_suggestions", period),
		]);

	if (
		resumeCreationGens.status === "rejected" ||
		conversationGens.status === "rejected" ||
		analyses.status === "rejected" ||
		coaching.status === "rejected" ||
		totalResumes.status === "rejected" ||
		inlineSuggestions.status === "rejected"
	) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "No se pudo encontrar uso para alguno de los modelos",
		});
	}

	const usage: UsageSnapshot = {
		resumes_total: totalResumes.value,
		resume_creation_generations_per_cycle: resumeCreationGens.value,
		conversation_generations_per_cycle: conversationGens.value,
		resume_analyses_per_cycle: analyses.value,
		coaching_sessions_per_cycle: coaching.value,
		resume_inline_ai_suggestions: inlineSuggestions.value,
	};

	const remaining = {
		resumes_total: remainingQuota(entitlements.resumes_total, usage.resumes_total),
		resume_creation_generations_per_cycle: remainingQuota(
			entitlements.resume_creation_generations_per_cycle,
			usage.resume_creation_generations_per_cycle
		),
		conversation_generations_per_cycle: remainingQuota(
			entitlements.conversation_generations_per_cycle,
			usage.conversation_generations_per_cycle
		),
		resume_analyses_per_cycle: remainingQuota(entitlements.resume_analyses_per_cycle, usage.resume_analyses_per_cycle),
		coaching_sessions_per_cycle: remainingQuota(
			entitlements.coaching_sessions_per_cycle,
			usage.coaching_sessions_per_cycle
		),
		resume_inline_ai_suggestions: remainingQuota(
			entitlements.resume_inline_ai_suggestions,
			usage.resume_inline_ai_suggestions
		),
	} satisfies UsageSnapshotResult["remaining"];

	return {
		subscription: {
			id: subscription.id,
			planId: subscription.planId,
			status: subscription.status,
			provider: subscription.provider,
			currentPeriodStart: subscription.currentPeriodStart,
			currentPeriodEnd: subscription.currentPeriodEnd,
		},
		plan: {
			id: plan.id,
			displayName: plan.displayName,
		},
		effectivePlan: {
			id: effectivePlan.id,
			displayName: effectivePlan.displayName,
		},
		entitlements,
		usage,
		remaining,
	};
}

/**
 * Build a structured `QUOTA_EXCEEDED` payload + matching ORPCError. Callers prefer `assertQuota`
 * but this is exported so providers/jobs (Trigger tasks, webhooks) can raise the same shape.
 */
export function buildQuotaError(payload: QuotaErrorPayload): ORPCError<"FORBIDDEN", QuotaErrorPayload> {
	return new ORPCError("FORBIDDEN", {
		message: `Has alcanzado el límite de tu plan para ${payload.limitKey}.`,
		data: payload,
	});
}

/**
 * Throw if the user has no quota remaining for `limitKey`. Reuses the cached subscription and,
 * for cycle-scoped metrics, the cached counter for that metric — no duplicate DB reads.
 *
 * For `messages_per_generation` pass `{ generationId }` in `context`. That metric is per
 * generation (not per cycle) and counts user messages on that specific generation.
 */
export async function assertSingleQuota(
	db: Database,
	userId: string,
	limitKey: LimitKey,
	context: AssertQuotaContext = {}
): Promise<void> {
	const subscription = await getActiveSubscriptionForUser(db, userId);
	const entitlements = getEffectiveEntitlements(subscription);
	await assertLimit(db, userId, limitKey, subscription, entitlements, context);
}

/**
 * Assert several quota limits in a single pass while reading the subscription row — and its
 * entitlements — exactly once. Prefer this over chaining `assertQuota` calls on routes that gate
 * more than one limit: each `assertQuota` re-reads the cached subscription, so back-to-back calls
 * issue a redundant `user_subscriptions` read (a second Redis round-trip, or a duplicate libSQL
 * query when the cache is cold) for the same request.
 *
 * Per-metric counter reads are still issued once per distinct `limitKey` (the counters differ).
 * Keys are evaluated in order, so the first exhausted limit is the one that throws — matching the
 * short-circuit behaviour of sequential `assertQuota` calls.
 */
export async function assertMultipleQuotas(
	db: Database,
	userId: string,
	limitKeys: LimitKey[],
	context: AssertQuotaContext = {}
): Promise<void> {
	if (limitKeys.length === 0) {
		return;
	}

	const subscription = await getActiveSubscriptionForUser(db, userId);
	const entitlements = getEffectiveEntitlements(subscription);

	for (const limitKey of limitKeys) {
		await assertLimit(db, userId, limitKey, subscription, entitlements, context);
	}
}

/**
 * Per-key quota check against an already-fetched subscription + entitlements. Internal: callers go
 * through {@link assertSingleQuota} or {@link assertMultipleQuotas}, which own the single subscription read.
 */
async function assertLimit(
	db: Database,
	userId: string,
	limitKey: LimitKey,
	subscription: SubscriptionRow,
	entitlements: EntitlementMap,
	context: AssertQuotaContext
): Promise<void> {
	const limit = entitlements[limitKey];

	if (isUnlimited(limit)) {
		return;
	}

	const currentUsage = await readCurrentUsage(db, userId, limitKey, subscription, context);

	if (hasQuotaRemaining(limit, currentUsage)) {
		return;
	}

	throw buildQuotaError({
		code: "QUOTA_EXCEEDED",
		limitKey,
		planId: getEffectivePlanId(subscription),
		currentUsage,
		limit,
		currentPeriodEnd: subscription.currentPeriodEnd,
	});
}

async function readCurrentUsage(
	db: Database,
	userId: string,
	limitKey: LimitKey,
	subscription: SubscriptionRow,
	context: AssertQuotaContext
): Promise<number> {
	if (limitKey === "messages_per_generation") {
		if (!context.generationId) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "messages_per_generation requires generationId",
			});
		}

		const [rows] = await db
			.select({ value: count() })
			.from(messages)
			.where(and(eq(messages.generationId, context.generationId), eq(messages.isAssistant, false)));

		return rows?.value ?? 0;
	}

	// `cover_letter_versions` is a per-letter cap enforced in `letters.trigger`, not via assertQuota.
	if (limitKey === "cover_letter_versions") {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "cover_letter_versions se valida en letters.trigger, no por assertQuota",
		});
	}

	return readCachedUsageCounter(db, userId, limitKey, periodFromSubscription(subscription));
}

export interface ApplyProviderSubscriptionStateInput {
	currentPeriodEnd: Date;
	currentPeriodStart: Date;
	planId: PlanId;
	provider: SubscriptionProvider;
	providerCustomerId?: string | null;
	providerSubscriptionId?: string | null;
	status: SubscriptionStatus;
	userId: string;
}

/**
 * Overwrite the single `user_subscriptions` row for a user with provider-derived state and
 * fully invalidate that user's cache (subscription row + every usage counter) because
 * plan/status/period changes all imply stale counters.
 *
 * Use this for webhook reconciliation, manual admin overrides, and provider checkout success.
 * Never creates a second row — the unique `userId` index enforces single-row.
 */
export async function applyProviderSubscriptionState(
	db: Database,
	input: ApplyProviderSubscriptionStateInput
): Promise<SubscriptionRow> {
	const [row] = await db
		.update(userSubscriptions)
		.set({
			planId: input.planId,
			status: input.status,
			provider: input.provider,
			providerCustomerId: input.providerCustomerId ?? null,
			providerSubscriptionId: input.providerSubscriptionId ?? null,
			currentPeriodStart: input.currentPeriodStart,
			currentPeriodEnd: input.currentPeriodEnd,
		})
		.where(eq(userSubscriptions.userId, input.userId))
		.returning();

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "No existe una suscripción local para el usuario",
		});
	}

	await invalidateViewerSubscription(db, input.userId);
	return row;
}

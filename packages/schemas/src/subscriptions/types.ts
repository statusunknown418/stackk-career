import { z } from "zod";

export const planIdEnum = ["free", "pro", "max"] as const;
export const planIdSchema = z.enum(planIdEnum);
export type PlanId = (typeof planIdEnum)[number];

export const subscriptionStatusEnum = ["active", "past_due", "paused", "canceled", "expired", "trialing"] as const;
export type SubscriptionStatus = (typeof subscriptionStatusEnum)[number];

export const subscriptionProviderEnum = ["system", "mercadopago"] as const;
export type SubscriptionProvider = (typeof subscriptionProviderEnum)[number];

export const limitKeyEnum = [
	"resumes_total",
	"resume_creation_generations_per_cycle",
	"conversation_generations_per_cycle",
	"cover_letter_generations_per_cycle",
	"resume_analyses_per_cycle",
	"resume_inline_ai_suggestions",
	"messages_per_generation",
	"coaching_sessions_per_cycle",
	"cover_letter_versions",
] as const;
export const limitKeySchema = z.enum(limitKeyEnum);
export type LimitKey = (typeof limitKeyEnum)[number];

/**
 * Subset of {@link LimitKey} that maps to a cached per-user counter on `viewer.usage`.
 *
 * Excludes `messages_per_generation` and `cover_letter_versions` because those are per-generation
 * caps (counted live from a specific generation's messages), not per-cycle counters.
 *
 * Mapping to underlying tables:
 * - `resumes_total` → `resumes` (all-time count, not period-scoped)
 * - `resume_creation_generations_per_cycle` → `generations` WHERE `type = "resume-creation"` (per cycle; AI-from-source only, not manual)
 * - `conversation_generations_per_cycle` → `generations` WHERE `type = "conversation"` (per cycle)
 * - `cover_letter_generations_per_cycle` → `generations` WHERE `type = "cover-letter"` (per cycle)
 * - `resume_analyses_per_cycle` → `resume_analyses` (per cycle)
 * - `resume_inline_ai_suggestions` → `messages` WHERE `objectType = "resume-suggestion"` AND `isAssistant = false`, owned via `generations.owner` (per cycle)
 * - `coaching_sessions_per_cycle` → `coaching_sessions` (per cycle)
 */
export type CachedUsageLimitKey = Exclude<LimitKey, "messages_per_generation" | "cover_letter_versions">;
export const cachedUsageLimitKeys: readonly CachedUsageLimitKey[] = limitKeyEnum.filter(
	(key): key is CachedUsageLimitKey => key !== "messages_per_generation" && key !== "cover_letter_versions"
);

/**
 * Drizzle cache tag for a single user's usage counter. Source of truth for both api reads
 * (`.$withCache({ tag })`) and job-side invalidations (`db.$cache.invalidate({ tags })`).
 */
export function viewerUsageTag(userId: string, metric: CachedUsageLimitKey): string {
	return `viewer:usage:${userId}:${metric}`;
}

export const unlimitedSentinel = "unlimited" as const;
export type Unlimited = typeof unlimitedSentinel;

export const limitValueSchema = z.union([z.number().int().nonnegative(), z.literal(unlimitedSentinel)]);
export type LimitValue = number | Unlimited;

export const entitlementMapSchema = z.object({
	resumes_total: limitValueSchema,
	resume_creation_generations_per_cycle: limitValueSchema,
	conversation_generations_per_cycle: limitValueSchema,
	cover_letter_generations_per_cycle: limitValueSchema,
	resume_analyses_per_cycle: limitValueSchema,
	resume_inline_ai_suggestions: limitValueSchema,
	messages_per_generation: limitValueSchema,
	coaching_sessions_per_cycle: limitValueSchema,
	cover_letter_versions: limitValueSchema,
});
export type EntitlementMap = z.infer<typeof entitlementMapSchema>;

export const usageSnapshotSchema = z.object({
	resumes_total: z.number().int().nonnegative(),
	resume_creation_generations_per_cycle: z.number().int().nonnegative(),
	conversation_generations_per_cycle: z.number().int().nonnegative(),
	cover_letter_generations_per_cycle: z.number().int().nonnegative(),
	resume_analyses_per_cycle: z.number().int().nonnegative(),
	resume_inline_ai_suggestions: z.number().int().nonnegative(),
	coaching_sessions_per_cycle: z.number().int().nonnegative(),
});
export type UsageSnapshot = z.infer<typeof usageSnapshotSchema>;

export const billingPeriodSchema = z.object({
	currentPeriodStart: z.date(),
	currentPeriodEnd: z.date(),
});
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;

export const quotaErrorPayloadSchema = z.object({
	code: z.literal("QUOTA_EXCEEDED"),
	limitKey: limitKeySchema,
	planId: planIdSchema,
	currentUsage: z.number().int().nonnegative(),
	limit: limitValueSchema,
	currentPeriodEnd: z.date().nullable(),
});
export type QuotaErrorPayload = z.infer<typeof quotaErrorPayloadSchema>;

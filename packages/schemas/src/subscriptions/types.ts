import { z } from "zod";

export const planIdEnum = ["free", "pro", "max"] as const;
export const planIdSchema = z.enum(planIdEnum);
export type PlanId = (typeof planIdEnum)[number];

export const subscriptionStatusEnum = ["active", "past_due", "canceled", "expired", "trialing"] as const;
export const subscriptionStatusSchema = z.enum(subscriptionStatusEnum);
export type SubscriptionStatus = (typeof subscriptionStatusEnum)[number];

export const subscriptionProviderEnum = ["system", "mercadopago"] as const;
export const subscriptionProviderSchema = z.enum(subscriptionProviderEnum);
export type SubscriptionProvider = (typeof subscriptionProviderEnum)[number];

export const limitKeyEnum = [
	"resumes_total",
	"resume_creation_generations_per_cycle",
	"conversation_generations_per_cycle",
	"resume_analyses_per_cycle",
	"messages_per_generation",
	"coaching_sessions_per_cycle",
] as const;
export const limitKeySchema = z.enum(limitKeyEnum);
export type LimitKey = (typeof limitKeyEnum)[number];

/**
 * Subset of {@link LimitKey} that maps to a cached per-user counter on `viewer.usage`.
 *
 * Excludes `messages_per_generation` because that is a per-generation cap (counted from a
 * specific generation's messages), not a per-cycle counter derived from a single table.
 *
 * Mapping to underlying tables:
 * - `resumes_total` → `resumes` (all-time count, not period-scoped)
 * - `resume_creation_generations_per_cycle` → `generations` WHERE `type = "resume-creation"` (per cycle)
 * - `conversation_generations_per_cycle` → `generations` WHERE `type = "conversation"` (per cycle)
 * - `resume_analyses_per_cycle` → `resume_analyses` (per cycle)
 * - `coaching_sessions_per_cycle` → `coaching_sessions` (per cycle)
 */
export type CachedUsageLimitKey = Exclude<LimitKey, "messages_per_generation">;
export const cachedUsageLimitKeys: readonly CachedUsageLimitKey[] = limitKeyEnum.filter(
	(key): key is CachedUsageLimitKey => key !== "messages_per_generation"
);
export const cachedUsageLimitKeySchema = limitKeySchema.exclude(["messages_per_generation"]);

export const unlimitedSentinel = "unlimited" as const;
export type Unlimited = typeof unlimitedSentinel;

export const limitValueSchema = z.union([z.number().int().nonnegative(), z.literal(unlimitedSentinel)]);
export type LimitValue = number | Unlimited;

export const entitlementMapSchema = z.object({
	resumes_total: limitValueSchema,
	resume_creation_generations_per_cycle: limitValueSchema,
	conversation_generations_per_cycle: limitValueSchema,
	resume_analyses_per_cycle: limitValueSchema,
	messages_per_generation: limitValueSchema,
	coaching_sessions_per_cycle: limitValueSchema,
});
export type EntitlementMap = z.infer<typeof entitlementMapSchema>;

export const usageSnapshotSchema = z.object({
	resumes_total: z.number().int().nonnegative(),
	resume_creation_generations_per_cycle: z.number().int().nonnegative(),
	conversation_generations_per_cycle: z.number().int().nonnegative(),
	resume_analyses_per_cycle: z.number().int().nonnegative(),
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

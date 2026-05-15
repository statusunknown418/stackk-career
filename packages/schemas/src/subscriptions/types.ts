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

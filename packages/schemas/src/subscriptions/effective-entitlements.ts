import { PLAN_CATALOG } from "./catalog";
import type { EntitlementMap, PlanId, SubscriptionStatus } from "./types";

export interface EffectiveSubscriptionInput {
	planId: PlanId;
	status: SubscriptionStatus;
}

export function hasActiveSubscriptionAccess(status: SubscriptionStatus): boolean {
	return status === "active" || status === "trialing";
}

export function getEffectivePlanId(subscription: EffectiveSubscriptionInput): PlanId {
	if (subscription.planId === "free" || hasActiveSubscriptionAccess(subscription.status)) {
		return subscription.planId;
	}
	return "free";
}

export function getEffectiveEntitlements(subscription: EffectiveSubscriptionInput): EntitlementMap {
	return PLAN_CATALOG[getEffectivePlanId(subscription)].entitlements;
}

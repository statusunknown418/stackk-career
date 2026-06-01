import { env } from "@stackk-career/env/server";
import type { PlanId } from "@stackk-career/schemas/subscriptions";

/**
 * Local paid plans that map to a Mercado Pago associated `preapproval_plan_id`.
 * `free` is intentionally excluded — it is never checked out via the provider.
 */
export type PaidPlanId = Exclude<PlanId, "free">;

const LOCAL_TO_PROVIDER: Record<PaidPlanId, () => string> = {
	pro: () => env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID,
	max: () => env.MERCADOPAGO_MAX_MONTHLY_PLAN_ID,
};

/**
 * Resolve a local paid plan to its Mercado Pago associated plan id.
 * Throws if called with `free` — that plan is local-only and must never reach checkout.
 */
export function providerPlanIdForLocalPlan(planId: PlanId): string {
	if (planId === "free") {
		throw new Error("free plan does not map to a Mercado Pago preapproval plan");
	}
	return LOCAL_TO_PROVIDER[planId]();
}

/**
 * Resolve a Mercado Pago associated plan id back to the local plan it represents.
 * Returns `null` when the provider plan id is unknown — callers should treat that as a
 * mismatch and skip mutating local state.
 */
export function localPlanIdForProviderPlan(providerPlanId: string): PaidPlanId | null {
	if (providerPlanId === env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID) {
		return "pro";
	}
	if (providerPlanId === env.MERCADOPAGO_MAX_MONTHLY_PLAN_ID) {
		return "max";
	}
	return null;
}

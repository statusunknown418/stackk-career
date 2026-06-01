import type { LimitValue } from "./types";
import { unlimitedSentinel } from "./types";

export function isUnlimited(value: LimitValue): value is typeof unlimitedSentinel {
	return value === unlimitedSentinel;
}

/**
 * Whether a plan grants any access to a feature: `unlimited` or a positive limit. A `0` limit means
 * the feature is gated for this plan (e.g. coaching on `free`). Used by the frontend to blur/lock
 * premium surfaces without re-deriving plan logic.
 */
export function hasFeatureAccess(limit: LimitValue): boolean {
	return isUnlimited(limit) || limit > 0;
}

export function hasQuotaRemaining(limit: LimitValue, currentUsage: number): boolean {
	if (isUnlimited(limit)) {
		return true;
	}
	return currentUsage < limit;
}

export function remainingQuota(limit: LimitValue, currentUsage: number): number | typeof unlimitedSentinel {
	if (isUnlimited(limit)) {
		return unlimitedSentinel;
	}
	return Math.max(0, limit - currentUsage);
}

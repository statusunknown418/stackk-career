import type { LimitValue } from "./types";
import { unlimitedSentinel } from "./types";

export function isUnlimited(value: LimitValue): value is typeof unlimitedSentinel {
	return value === unlimitedSentinel;
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

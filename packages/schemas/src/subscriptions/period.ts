import { addMonths } from "date-fns";
import type { BillingPeriod } from "./types";

export function createMonthlyPeriod(from: Date = new Date()): BillingPeriod {
	const start = new Date(from);
	const end = addMonths(start, 1);
	return { currentPeriodStart: start, currentPeriodEnd: end };
}

export function isWithinPeriod(period: BillingPeriod, at: Date = new Date()): boolean {
	return at >= period.currentPeriodStart && at < period.currentPeriodEnd;
}

export function rollPeriodForward(period: BillingPeriod): BillingPeriod {
	const start = new Date(period.currentPeriodEnd);
	const end = addMonths(start, 1);
	return { currentPeriodStart: start, currentPeriodEnd: end };
}

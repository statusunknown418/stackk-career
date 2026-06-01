import { addMonths } from "date-fns";
import type { BillingPeriod } from "./types";

export function createMonthlyPeriod(from: Date = new Date()): BillingPeriod {
	const start = new Date(from);
	const end = addMonths(start, 1);
	return { currentPeriodStart: start, currentPeriodEnd: end };
}

import { addMonths } from "date-fns";

const MINIMUM_MONTHLY_BILLING_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface DeriveBillingWindowInput {
	dateCreated: Date;
	lastChargedDate: Date | null;
	nextPaymentDate: Date | null;
}

/**
 * Derive the quota window for monthly provider subscriptions.
 *
 * Mercado Pago can report the first authorized charge as `next_payment_date` on newly-created
 * preapprovals. That same-day value is not a usable quota reset boundary for a monthly plan, so
 * fall back to the local monthly cadence unless the provider returns a future boundary far enough
 * from the period start to be a real renewal date. Mercado Pago's proportional-amount flow only
 * applies when `billing_day` / `billing_day_proportional` are configured on a monthly plan; this
 * integration does not set those fields, so the fallback stays a plain monthly window.
 */
export function deriveBillingWindow(input: DeriveBillingWindowInput): {
	currentPeriodEnd: Date;
	currentPeriodStart: Date;
} {
	const start = input.lastChargedDate ?? input.dateCreated;
	const fallbackEnd = addMonths(start, 1);
	const providerEnd = input.nextPaymentDate;

	if (!providerEnd || providerEnd.getTime() - start.getTime() < MINIMUM_MONTHLY_BILLING_WINDOW_MS) {
		return { currentPeriodEnd: fallbackEnd, currentPeriodStart: start };
	}

	return { currentPeriodEnd: providerEnd, currentPeriodStart: start };
}

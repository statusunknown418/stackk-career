import { z } from "zod";
import { planIdSchema } from "../subscriptions/types";

/**
 * Paid plans only — `free` is local-only and must never reach Mercado Pago checkout.
 */
export const paidPlanIdSchema = planIdSchema.exclude(["free"]);
export type PaidPlanIdInput = z.infer<typeof paidPlanIdSchema>;

export const createSubscriptionInputSchema = z.object({
	backUrl: z.string().url(),
	cardTokenId: z.string().min(1),
	/** Mercado Pago device fingerprint from `window.MP_DEVICE_SESSION_ID`; improves card validation. */
	deviceId: z.string().min(1).optional(),
	payerEmail: z.string().email(),
	planId: paidPlanIdSchema,
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>;

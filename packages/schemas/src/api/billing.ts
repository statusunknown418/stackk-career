import { z } from "zod";
import { planIdSchema } from "../subscriptions/types";

/**
 * Paid plans only — `free` is local-only and must never reach Mercado Pago checkout.
 */
export const paidPlanIdSchema = planIdSchema.exclude(["free"]);
export type PaidPlanIdInput = z.infer<typeof paidPlanIdSchema>;

export const createSubscriptionInputSchema = z.object({
	backUrl: z.url(),
	cardTokenId: z.string().min(1),
	deviceId: z.string().min(1).optional(),
	payerEmail: z.email(),
	planId: paidPlanIdSchema,
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>;

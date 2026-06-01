import type { SubscriptionStatus } from "./types";

/**
 * Mercado Pago `preapproval.status` values.
 * @see https://www.mercadopago.com.pe/developers/en/reference/subscriptions/_preapproval/get
 */
export const mercadopagoPreapprovalStatusEnum = ["pending", "authorized", "paused", "cancelled", "finished"] as const;
export type MercadopagoPreapprovalStatus = (typeof mercadopagoPreapprovalStatusEnum)[number];

/**
 * Normalize a Mercado Pago `preapproval.status` to the local subscription status enum.
 *
 * Mapping rationale:
 * - `authorized` → `active` (recurring billing live)
 * - `pending` → `trialing` (awaiting first authorization)
 * - `paused` → `paused` (user-requested pause stops future renewals without provider refund flow)
 * - `cancelled` → `canceled` (provider-side hard cancellation)
 * - `finished` → `expired` (recurrence ended naturally)
 */
export function normalizePreapprovalStatus(status: MercadopagoPreapprovalStatus): SubscriptionStatus {
	const map: Record<MercadopagoPreapprovalStatus, SubscriptionStatus> = {
		authorized: "active",
		pending: "trialing",
		paused: "paused",
		cancelled: "canceled",
		finished: "expired",
	};
	return map[status];
}

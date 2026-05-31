import { z } from "zod";
import { mercadopagoPreapprovalStatusEnum } from "./provider-status";

/**
 * Subset of the Mercado Pago `preapproval` payload we depend on.
 *
 * Used to validate SDK responses (create / get / update) before normalizing them into local
 * subscription state. `passthrough()` keeps unknown fields available for debugging without
 * coupling us to the full surface area.
 */
export const mercadopagoPreapprovalResponseSchema = z
	.object({
		id: z.string().min(1),
		status: z.enum(mercadopagoPreapprovalStatusEnum),
		date_created: z.string().nullish(),
		external_reference: z.string().nullish(),
		last_charged_date: z.string().nullish(),
		next_payment_date: z.string().nullish(),
		payer_id: z
			.union([z.string(), z.number()])
			.nullish()
			.transform((v) => (v === null || v === undefined ? null : String(v))),
		preapproval_plan_id: z.string().nullish(),
	})
	.passthrough();

export type MercadopagoPreapprovalResponse = z.infer<typeof mercadopagoPreapprovalResponseSchema>;

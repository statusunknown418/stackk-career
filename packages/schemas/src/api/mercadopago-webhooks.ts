import { z } from "zod";

/**
 * Subset of Mercado Pago webhook envelope we depend on. MP sends several flavors of payload
 * (`type` + `action` + `data.id`); we validate only the fields shared across them.
 *
 * @see https://www.mercadopago.com.pe/developers/en/docs/your-integrations/notifications/webhooks
 */
export const mercadopagoWebhookEnvelopeSchema = z
	.object({
		id: z.union([z.string(), z.number()]).optional(),
		type: z.string().optional(),
		action: z.string().optional(),
		live_mode: z.boolean().optional(),
		date_created: z.string().optional(),
		user_id: z.union([z.string(), z.number()]).optional(),
		api_version: z.string().optional(),
		data: z
			.object({
				id: z.union([z.string(), z.number()]).optional(),
			})
			.passthrough()
			.optional(),
	})
	.passthrough();

export type MercadopagoWebhookEnvelope = z.infer<typeof mercadopagoWebhookEnvelopeSchema>;

/**
 * Authorized-payment payload shape returned by `GET /authorized_payments/:id`.
 * Used to recover the `preapproval_id` for `subscription_authorized_payment` webhook events.
 */
export const mercadopagoAuthorizedPaymentResponseSchema = z
	.object({
		id: z.union([z.string(), z.number()]),
		preapproval_id: z.string().nullish(),
		status: z.string().nullish(),
		payment_id: z.union([z.string(), z.number()]).nullish(),
	})
	.passthrough();

export type MercadopagoAuthorizedPaymentResponse = z.infer<typeof mercadopagoAuthorizedPaymentResponseSchema>;

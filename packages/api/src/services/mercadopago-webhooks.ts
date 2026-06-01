import { ORPCError } from "@orpc/server";
import { db } from "@stackk-career/db";
import { billingEvents, userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import { env } from "@stackk-career/env/server";
import {
	type MercadopagoWebhookEnvelope,
	mercadopagoWebhookEnvelopeSchema,
} from "@stackk-career/schemas/api/mercadopago-webhooks";
import { and, eq } from "drizzle-orm";
import type { RequestLogger } from "evlog";
import { WebhookSignatureValidator } from "mercadopago";
import { applyProviderCheckoutResult, fetchAuthorizedPayment, fetchPreapproval } from "./mercadopago";

interface WebhookSignatureInput {
	dataId: string | null;
	requestId: string | null;
	signature: string | null;
}

/**
 * Verify the `x-signature` header sent by Mercado Pago webhooks.
 *
 * @see https://www.mercadopago.com.pe/developers/en/docs/your-integrations/notifications/webhooks#bookmark_signature_validation
 */
export function verifyMercadopagoSignature({ requestId, signature, dataId }: WebhookSignatureInput): boolean {
	try {
		WebhookSignatureValidator.validate({
			dataId,
			secret: env.MERCADOPAGO_WEBHOOK_SECRET,
			xRequestId: requestId,
			xSignature: signature,
		});
		return true;
	} catch {
		return false;
	}
}

interface RecordedEvent {
	duplicate: boolean;
	eventId: string;
	rowId: string;
}

/**
 * Persist the webhook envelope into `billing_events` for audit + idempotency. Returns
 * `duplicate: true` when an event with the same `(provider, providerEventId)` already exists,
 * so the caller can short-circuit side effects.
 */
async function recordEvent(envelope: MercadopagoWebhookEnvelope, rawBody: string): Promise<RecordedEvent> {
	const eventId = String(envelope.id ?? "");
	const eventType = envelope.type ? `${envelope.type}${envelope.action ? `:${envelope.action}` : ""}` : "unknown";

	if (!eventId) {
		const [inserted] = await db
			.insert(billingEvents)
			.values({
				provider: "mercadopago",
				eventType,
				payload: rawBody,
			})
			.returning({ id: billingEvents.id });

		if (!inserted) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No se pudo registrar el evento de billing" });
		}
		return { eventId: "", duplicate: false, rowId: inserted.id };
	}

	const existing = await db
		.select({ id: billingEvents.id, processedAt: billingEvents.processedAt })
		.from(billingEvents)
		.where(and(eq(billingEvents.provider, "mercadopago"), eq(billingEvents.providerEventId, eventId)))
		.limit(1);

	if (existing[0]) {
		return { eventId, duplicate: existing[0].processedAt !== null, rowId: existing[0].id };
	}

	const [inserted] = await db
		.insert(billingEvents)
		.values({
			provider: "mercadopago",
			providerEventId: eventId,
			eventType,
			payload: rawBody,
		})
		.returning({ id: billingEvents.id });

	if (!inserted) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No se pudo registrar el evento de billing" });
	}

	return { eventId, duplicate: false, rowId: inserted.id };
}

async function markProcessed(rowId: string, userId: string | null, subscriptionId: string | null): Promise<void> {
	await db
		.update(billingEvents)
		.set({ processedAt: new Date(), userId, subscriptionId, error: null })
		.where(eq(billingEvents.id, rowId));
}

async function markFailed(rowId: string, error: unknown): Promise<void> {
	const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	await db.update(billingEvents).set({ error: message }).where(eq(billingEvents.id, rowId));
}

async function findUserByPreapprovalId(preapprovalId: string): Promise<{ id: string; userId: string } | null> {
	const rows = await db
		.select({ id: userSubscriptions.id, userId: userSubscriptions.userId })
		.from(userSubscriptions)
		.where(eq(userSubscriptions.providerSubscriptionId, preapprovalId))
		.limit(1);

	return rows[0] ?? null;
}

/**
 * Resolve the owning `preapproval_id` for a webhook event. For preapproval events `data.id` is
 * already the preapproval. For authorized-payment events we hit `/authorized_payments/:id` to
 * recover it.
 */
async function resolvePreapprovalId(envelope: MercadopagoWebhookEnvelope): Promise<string | null> {
	const dataId = envelope.data?.id ? String(envelope.data.id) : null;
	if (!dataId) {
		return null;
	}

	const type = envelope.type;
	if (type === "subscription_preapproval" || type === "preapproval") {
		return dataId;
	}

	if (type === "subscription_authorized_payment" || type === "authorized_payment") {
		const authorized = await fetchAuthorizedPayment(dataId);
		return authorized.preapproval_id ? String(authorized.preapproval_id) : null;
	}

	return null;
}

interface HandleWebhookResult {
	duplicate: boolean;
	preapprovalId: string | null;
	processed: boolean;
	userId: string | null;
}

/**
 * Process a verified Mercado Pago webhook envelope. Idempotent on `(provider, providerEventId)`.
 * Resolves the owning local subscription via `preapproval_id` or provider `external_reference`,
 * refetches authoritative provider state, and overwrites the single `user_subscriptions` row through
 * `applyProviderCheckoutResult` — which fully invalidates that user's cache because every
 * effective-state change implies stale usage counters.
 */
export async function handleMercadopagoWebhook(
	envelope: MercadopagoWebhookEnvelope,
	rawBody: string,
	log?: RequestLogger
): Promise<HandleWebhookResult> {
	const recorded = await recordEvent(envelope, rawBody);

	if (recorded.duplicate) {
		log?.set({ billing: { webhook: "duplicate", eventId: recorded.eventId } });
		return { duplicate: true, processed: false, preapprovalId: null, userId: null };
	}

	try {
		const preapprovalId = await resolvePreapprovalId(envelope);

		if (!preapprovalId) {
			log?.set({ billing: { webhook: "skipped_no_preapproval", type: envelope.type, action: envelope.action } });
			await markProcessed(recorded.rowId, null, null);
			return { duplicate: false, processed: true, preapprovalId: null, userId: null };
		}

		const state = await fetchPreapproval(preapprovalId);
		const owner = await findUserByPreapprovalId(preapprovalId);
		const userId = owner?.userId ?? state.externalReference;

		if (!userId) {
			log?.set({ billing: { webhook: "skipped_unknown_preapproval", preapprovalId } });
			await markProcessed(recorded.rowId, null, null);
			return { duplicate: false, processed: true, preapprovalId, userId: null };
		}

		const row = await applyProviderCheckoutResult(db, { state, userId });

		log?.set({
			billing: {
				webhook: "applied",
				eventId: recorded.eventId,
				eventType: `${envelope.type}:${envelope.action ?? ""}`,
				preapprovalId,
				userId,
				planId: row.planId,
				status: row.status,
			},
		});

		await markProcessed(recorded.rowId, userId, row.id);
		return { duplicate: false, processed: true, preapprovalId, userId };
	} catch (error) {
		await markFailed(recorded.rowId, error);
		throw error;
	}
}

export { mercadopagoWebhookEnvelopeSchema };

import { ORPCError } from "@orpc/server";
import { env } from "@stackk-career/env/server";
import {
	type MercadopagoAuthorizedPaymentResponse,
	mercadopagoAuthorizedPaymentResponseSchema,
} from "@stackk-career/schemas/api/mercadopago-webhooks";
import {
	type MercadopagoPreapprovalResponse,
	type MercadopagoPreapprovalStatus,
	mercadopagoPreapprovalResponseSchema,
	normalizePreapprovalStatus,
	type PlanId,
	type SubscriptionStatus,
} from "@stackk-career/schemas/subscriptions";
import { parseISO } from "date-fns";
import { Invoice, MercadoPagoConfig, PreApproval } from "mercadopago";
import { localPlanIdForProviderPlan, type PaidPlanId, providerPlanIdForLocalPlan } from "../lib/mercadopago-mapping";
import { deriveBillingWindow } from "./billing-window";
import {
	type ApplyProviderSubscriptionStateInput,
	applyProviderSubscriptionState,
	type Database,
	type SubscriptionRow,
} from "./subscriptions";

const SDK_TIMEOUT_MS = 10_000;

let cachedClient: MercadoPagoConfig | null = null;
let cachedInvoice: Invoice | null = null;
let cachedPreApproval: PreApproval | null = null;

function getClient(): MercadoPagoConfig {
	if (!cachedClient) {
		cachedClient = new MercadoPagoConfig({
			accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
			options: { timeout: SDK_TIMEOUT_MS },
		});
	}
	return cachedClient;
}

function getPreApproval(): PreApproval {
	if (!cachedPreApproval) {
		cachedPreApproval = new PreApproval(getClient());
	}
	return cachedPreApproval;
}

function getInvoice(): Invoice {
	if (!cachedInvoice) {
		cachedInvoice = new Invoice(getClient());
	}
	return cachedInvoice;
}

/**
 * Subset of a Mercado Pago `preapproval` payload normalized for local consumption.
 */
export interface ProviderSubscriptionState {
	dateCreated: Date;
	externalReference: string | null;
	lastChargedDate: Date | null;
	nextPaymentDate: Date | null;
	payerId: string | null;
	preapprovalId: string;
	preapprovalPlanId: string | null;
	status: MercadopagoPreapprovalStatus;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
	if (value === null || value === undefined || value.length === 0) {
		return null;
	}
	const parsed = parseISO(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalize(response: MercadopagoPreapprovalResponse): ProviderSubscriptionState {
	return {
		dateCreated: parseOptionalDate(response.date_created) ?? new Date(),
		externalReference: response.external_reference ?? null,
		lastChargedDate: parseOptionalDate(response.last_charged_date),
		nextPaymentDate: parseOptionalDate(response.next_payment_date),
		payerId: response.payer_id ?? null,
		preapprovalId: response.id,
		preapprovalPlanId: response.preapproval_plan_id ?? null,
		status: response.status,
	};
}

export interface CreateSubscriptionInput {
	backUrl: string;
	cardTokenId: string;
	/** Mercado Pago device fingerprint (`window.MP_DEVICE_SESSION_ID`) — sent as `X-Meli-Session-Id` when present. */
	deviceId?: string;
	idempotencyKey: string;
	payerEmail: string;
	planId: PaidPlanId;
	userId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Extract the message Mercado Pago returned on a failed API call. The SDK throws the raw response
 * body (a plain object, not an `Error`) for API errors — e.g. `CC_VAL_433 Credit card validation has
 * failed` on a declined preapproval. Network/timeout failures arrive as real `Error` instances and
 * are left for the caller to rethrow as a genuine 5xx.
 */
function mercadopagoApiErrorMessage(error: unknown): string | null {
	if (error instanceof Error || !isRecord(error)) {
		return null;
	}

	const message = error.message;
	if (typeof message === "string" && message.length > 0) {
		return message;
	}

	return mercadopagoApiErrorMessage(error.cause) ?? mercadopagoApiErrorMessage(error.response);
}

/**
 * Surface Mercado Pago's own error message to the client as a `BAD_REQUEST` so the checkout sheet can
 * display it verbatim. The original provider body is kept as `cause` for logs. Anything that is not a
 * Mercado Pago API error body (e.g. network/timeout `Error`s) is rethrown unchanged as a 5xx.
 */
function normalizeCreatePreapprovalError(error: unknown): never {
	const message = mercadopagoApiErrorMessage(error);
	if (message !== null) {
		throw new ORPCError("BAD_REQUEST", { cause: error, message });
	}

	throw error;
}

/**
 * Create a Mercado Pago associated-plan subscription using a Checkout Bricks card token.
 * Returns the normalized provider state — does **not** mutate the local subscription row;
 * callers should pipe the result through {@link applyProviderCheckoutResult}.
 */
export async function createPreapproval(input: CreateSubscriptionInput): Promise<ProviderSubscriptionState> {
	const preapprovalPlanId = providerPlanIdForLocalPlan(input.planId);
	try {
		const response = await getPreApproval().create({
			body: {
				preapproval_plan_id: preapprovalPlanId,
				card_token_id: input.cardTokenId,
				payer_email: input.payerEmail,
				back_url: input.backUrl,
				external_reference: input.userId,
				status: "authorized",
			},
			requestOptions: {
				idempotencyKey: input.idempotencyKey,
				// Device fingerprint: Mercado Pago's antifraud rejects recurring-card validation
				// (CC_VAL_433) when this is missing on `status: "authorized"` preapprovals.
				meliSessionId: input.deviceId,
			},
		});

		return normalize(mercadopagoPreapprovalResponseSchema.parse(response));
	} catch (error) {
		normalizeCreatePreapprovalError(error);
	}
}

/**
 * Fetch the current state of a Mercado Pago preapproval. Used by webhooks and reconciliation
 * jobs whose inbound payload is incomplete.
 */
export async function fetchPreapproval(preapprovalId: string): Promise<ProviderSubscriptionState> {
	const response = await getPreApproval().get({ id: preapprovalId });
	return normalize(mercadopagoPreapprovalResponseSchema.parse(response));
}

/**
 * Fetch a Mercado Pago authorized payment (subscription invoice / auto-debit row). The SDK exposes
 * this endpoint through the `Invoice` client. We use this from webhook handlers to recover the
 * owning `preapproval_id` for `subscription_authorized_payment` events.
 */
export async function fetchAuthorizedPayment(
	authorizedPaymentId: string
): Promise<MercadopagoAuthorizedPaymentResponse> {
	const response = await getInvoice().get({ id: authorizedPaymentId });

	return mercadopagoAuthorizedPaymentResponseSchema.parse(response);
}

/**
 * Cancel a Mercado Pago preapproval. Use only when replacing or rolling back a provider
 * preapproval; user-requested plan cancellation should pause instead to avoid provider refunds.
 * The local row is **not** mutated here — webhook delivery eventually reconciles status, or callers
 * can immediately invoke {@link applyProviderCheckoutResult} with the returned state.
 */
export async function cancelPreapproval(preapprovalId: string): Promise<ProviderSubscriptionState> {
	const response = await getPreApproval().update({
		id: preapprovalId,
		body: { status: "cancelled" },
	});
	return normalize(mercadopagoPreapprovalResponseSchema.parse(response));
}

/**
 * Pause a Mercado Pago preapproval for user-requested cancellation. Mercado Pago documents
 * `paused` as the non-destructive alternative to `cancelled`, so this stops future renewals
 * without requesting provider-side cancellation/refund behavior.
 */
export async function pausePreapproval(preapprovalId: string): Promise<ProviderSubscriptionState> {
	const response = await getPreApproval().update({
		id: preapprovalId,
		body: { status: "paused" },
	});
	return normalize(mercadopagoPreapprovalResponseSchema.parse(response));
}

interface ApplyProviderCheckoutResultInput {
	state: ProviderSubscriptionState;
	userId: string;
}

/**
 * Translate provider state into {@link ApplyProviderSubscriptionStateInput} and overwrite the
 * single local `user_subscriptions` row. Throws when the provider's `preapproval_plan_id` does
 * not resolve to a known local plan — that indicates an env mismatch and must not silently
 * downgrade the user.
 */
export function applyProviderCheckoutResult(
	db: Database,
	input: ApplyProviderCheckoutResultInput
): Promise<SubscriptionRow> {
	const planId = resolveLocalPlanId(input.state.preapprovalPlanId);
	const status: SubscriptionStatus = normalizePreapprovalStatus(input.state.status);
	const window = deriveBillingWindow({
		dateCreated: input.state.dateCreated,
		lastChargedDate: input.state.lastChargedDate,
		nextPaymentDate: input.state.nextPaymentDate,
	});

	const payload: ApplyProviderSubscriptionStateInput = {
		currentPeriodEnd: window.currentPeriodEnd,
		currentPeriodStart: window.currentPeriodStart,
		planId,
		provider: "mercadopago",
		providerCustomerId: input.state.payerId,
		providerSubscriptionId: input.state.preapprovalId,
		status,
		userId: input.userId,
	};

	return applyProviderSubscriptionState(db, payload);
}

function resolveLocalPlanId(preapprovalPlanId: string | null): PlanId {
	if (!preapprovalPlanId) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Mercado Pago preapproval missing preapproval_plan_id; cannot map to a local plan",
		});
	}

	const local = localPlanIdForProviderPlan(preapprovalPlanId);

	if (!local) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Unknown Mercado Pago preapproval_plan_id: ${preapprovalPlanId}`,
		});
	}

	return local;
}

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
import { addMonths, parseISO } from "date-fns";
import { Invoice, MercadoPagoConfig, PreApproval } from "mercadopago";
import { localPlanIdForProviderPlan, type PaidPlanId, providerPlanIdForLocalPlan } from "../lib/mercadopago-mapping";
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
	idempotencyKey: string;
	payerEmail: string;
	planId: PaidPlanId;
	userId: string;
}

const CARD_TOKEN_SERVICE_NOT_FOUND = "Card token service not found";
const CARD_TOKEN_SUBSCRIPTION_MESSAGE =
	"Mercado Pago rechazó el token de tarjeta para suscripciones. Si estás probando con credenciales TEST-*, este flujo no crea suscripciones autorizadas con tarjeta.";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isCardTokenServiceNotFound(error: unknown): boolean {
	if (error instanceof Error && error.message.includes(CARD_TOKEN_SERVICE_NOT_FOUND)) {
		return true;
	}

	if (!isRecord(error)) {
		return false;
	}

	const message = error.message;
	const status = error.status;

	if (message === CARD_TOKEN_SERVICE_NOT_FOUND && (status === 404 || status === "404")) {
		return true;
	}

	return isCardTokenServiceNotFound(error.cause) || isCardTokenServiceNotFound(error.response);
}

function normalizeCreatePreapprovalError(error: unknown): never {
	if (isCardTokenServiceNotFound(error)) {
		throw new ORPCError("BAD_REQUEST", {
			cause: "mercadopago_card_token_service_not_found",
			message: CARD_TOKEN_SUBSCRIPTION_MESSAGE,
		});
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
 * Cancel a Mercado Pago preapproval. The local row is **not** mutated here — webhook delivery
 * eventually reconciles status, or callers can immediately invoke {@link applyProviderCheckoutResult}
 * with the returned state.
 */
export async function cancelPreapproval(preapprovalId: string): Promise<ProviderSubscriptionState> {
	const response = await getPreApproval().update({
		id: preapprovalId,
		body: { status: "cancelled" },
	});
	return normalize(mercadopagoPreapprovalResponseSchema.parse(response));
}

interface DerivePeriodInput {
	dateCreated: Date;
	lastChargedDate: Date | null;
	nextPaymentDate: Date | null;
}

function deriveBillingWindow(input: DerivePeriodInput): { currentPeriodEnd: Date; currentPeriodStart: Date } {
	const start = input.lastChargedDate ?? input.dateCreated;
	const end = input.nextPaymentDate ?? addMonths(start, 1);
	return { currentPeriodEnd: end, currentPeriodStart: start };
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

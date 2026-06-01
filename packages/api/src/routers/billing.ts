import { ORPCError } from "@orpc/server";
import { createSubscriptionInputSchema } from "@stackk-career/schemas/api/billing";
import { protectedProcedure } from "../index";
import {
	applyProviderCheckoutResult,
	cancelPreapproval,
	createPreapproval,
	pausePreapproval,
} from "../services/mercadopago";
import { getActiveSubscriptionForUser, getUsageSnapshot } from "../services/subscriptions";

export const billingRouter = {
	/**
	 * @description Cached snapshot: current plan, status, billing window, entitlements, usage, remaining quota.
	 */
	getSnapshot: protectedProcedure.handler(({ context }) => {
		const userId = context.session.user.id;
		context.log?.set({ billing: { action: "get_snapshot", userId } });
		return getUsageSnapshot(context.db, userId);
	}),

	/**
	 * @description Create Mercado Pago preapproval via Checkout Bricks card token and overwrite the
	 * single local subscription row. Rejects `free`.
	 */
	createSubscription: protectedProcedure.input(createSubscriptionInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;
		context.log?.set({
			billing: {
				action: "create_subscription",
				planId: input.planId,
				userId,
			},
		});

		const state = await createPreapproval({
			backUrl: input.backUrl,
			cardTokenId: input.cardTokenId,
			deviceId: input.deviceId,
			idempotencyKey: `subscription:${userId}:${input.planId}:${input.cardTokenId}`,
			payerEmail: input.payerEmail,
			planId: input.planId,
			userId,
		});

		const row = await applyProviderCheckoutResult(context.db, { state, userId });

		context.log?.set({
			billing: {
				outcome: "subscription_created",
				planId: row.planId,
				status: row.status,
				preapprovalId: state.preapprovalId,
			},
		});

		return getUsageSnapshot(context.db, userId);
	}),

	/**
	 * @description Switch the existing paid plan to another paid plan. Cancels the current MP
	 * preapproval and creates a new one using the same card token from Checkout Bricks. Mutates
	 * the same local subscription row.
	 */
	changePlan: protectedProcedure.input(createSubscriptionInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;
		const subscription = await getActiveSubscriptionForUser(context.db, userId);

		context.log?.set({
			billing: {
				action: "change_plan",
				currentPlanId: subscription.planId,
				nextPlanId: input.planId,
				userId,
			},
		});

		if (subscription.planId === input.planId && subscription.status === "active") {
			throw new ORPCError("BAD_REQUEST", { message: "Ya estás suscrito a ese plan" });
		}

		// Create the new preapproval first: a failure here leaves the current subscription untouched.
		const state = await createPreapproval({
			backUrl: input.backUrl,
			cardTokenId: input.cardTokenId,
			deviceId: input.deviceId,
			idempotencyKey: `change-plan:${userId}:${input.planId}:${input.cardTokenId}`,
			payerEmail: input.payerEmail,
			planId: input.planId,
			userId,
		});

		// Cancel the previous preapproval if one exists. If cancel fails, roll back the new
		// preapproval to avoid double billing.
		const previousPreapprovalId = subscription.provider === "mercadopago" ? subscription.providerSubscriptionId : null;

		if (previousPreapprovalId) {
			try {
				await cancelPreapproval(previousPreapprovalId);
			} catch (error) {
				try {
					await cancelPreapproval(state.preapprovalId);
				} catch {
					context.log?.set({
						billing: { outcome: "change_plan_rollback_failed", preapprovalId: state.preapprovalId },
					});
				}

				throw error;
			}
		}

		const row = await applyProviderCheckoutResult(context.db, { state, userId });

		context.log?.set({
			billing: {
				outcome: "plan_changed",
				planId: row.planId,
				status: row.status,
			},
		});

		return getUsageSnapshot(context.db, userId);
	}),

	/**
	 * @description Pause the Mercado Pago preapproval immediately and mirror the returned provider
	 * state locally. Pausing stops future renewals without provider-side cancellation/refund behavior.
	 */
	pauseSubscription: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const subscription = await getActiveSubscriptionForUser(context.db, userId);

		context.log?.set({
			billing: { action: "pause_subscription", planId: subscription.planId, userId },
		});

		if (subscription.planId === "free") {
			throw new ORPCError("BAD_REQUEST", { message: "El plan free no se puede pausar" });
		}

		const preapprovalId = subscription.providerSubscriptionId;
		if (subscription.provider !== "mercadopago" || !preapprovalId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No hay una suscripción activa con Mercado Pago",
			});
		}

		const state = await pausePreapproval(preapprovalId);
		await applyProviderCheckoutResult(context.db, { state, userId });

		return getUsageSnapshot(context.db, userId);
	}),
};

import { realtimeTokenSchema } from "@stackk-career/schemas/api/realtime";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { protectedProcedure } from "..";
import { getUsageSnapshot } from "../services/subscriptions";

const REALTIME_TOKEN_TTL_MS = 30 * 60 * 1000;
const REALTIME_TOKEN_EXPIRATION = "30m";

export const viewerRouter = {
	/**
	 * @description Returns the active subscription, entitlements and usage snapshot for the current cycle.
	 * @description Composition lives in `services/subscriptions.ts`; per-user cache tags are managed there.
	 * Mutation routes must call `invalidateViewerUsage(db, userId, [...])` after counted writes; subscription
	 * mutations call `invalidateViewerSubscription(db, userId)` so the new cycle window picks up fresh counts.
	 */
	usage: protectedProcedure.handler(async ({ context }) => getUsageSnapshot(context.db, context.session.user.id)),

	realtimeToken: protectedProcedure.output(realtimeTokenSchema).handler(async ({ context }) => {
		const userId = context.session.user.id;
		const token = await triggerAuth.createPublicToken({
			expirationTime: REALTIME_TOKEN_EXPIRATION,
			scopes: { read: { tags: [`user:${userId}`] } },
		});
		context.log?.set({
			viewer: { action: "realtime_token", userId },
		});
		return {
			expiresAtMs: Date.now() + REALTIME_TOKEN_TTL_MS,
			token,
		};
	}),
};

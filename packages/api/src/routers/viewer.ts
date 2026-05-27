import { ORPCError } from "@orpc/client";
import { coachingSessions } from "@stackk-career/db/schema/coaching-sessions";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumes } from "@stackk-career/db/schema/resumes";
import { userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import { realtimeTokenSchema } from "@stackk-career/schemas/api/realtime";
import {
	getEntitlements,
	type LimitValue,
	PLAN_CATALOG,
	remainingQuota,
	type unlimitedSentinel,
} from "@stackk-career/schemas/subscriptions";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { and, between, eq } from "drizzle-orm";
import { count } from "drizzle-orm/sql";
import { protectedProcedure } from "..";
import { viewerSubscriptionTag, viewerUsageTag } from "../lib/viewer-cache";

const CACHE_TTL_SECONDS = 300;
const REALTIME_TOKEN_TTL_MS = 30 * 60 * 1000;
const REALTIME_TOKEN_EXPIRATION = "30m";

export const viewerRouter = {
	/**
	 * @description Returns the active subscription, entitlements and usage snapshot for the current cycle.
	 * @description Resumes are counted since inception; all other metrics are counted within the active billing period.
	 * @description Cache is per-user via tag (no autoInvalidate). Mutation routes for resumes/generations/analyses/coaching
	 * must call `invalidateViewerUsage(db, userId, [...])` to bust the relevant tag. Subscription renewals must call
	 * `invalidateViewerSubscription(db, userId)` so the new cycle window picks up fresh counts.
	 */
	usage: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		const subscriptionRows = await context.db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, userId))
			.limit(1)
			.$withCache({
				tag: viewerSubscriptionTag(userId),
				config: { ex: CACHE_TTL_SECONDS },
			});

		const subscription = subscriptionRows[0];

		if (!subscription) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "El usuario no tiene una suscripción activa",
			});
		}

		const { currentPeriodStart, currentPeriodEnd, planId } = subscription;
		const entitlements = getEntitlements(planId);
		const plan = PLAN_CATALOG[planId];

		const [resumeCreationGens, conversationGens, analyses, coaching, totalResumes] = await Promise.allSettled([
			context.db
				.select({ value: count() })
				.from(generations)
				.where(
					and(
						eq(generations.owner, userId),
						eq(generations.type, "resume-creation"),
						between(generations.createdAt, currentPeriodStart, currentPeriodEnd)
					)
				)
				.$withCache({
					tag: viewerUsageTag(userId, "resume_creation_generations_per_cycle"),
					config: { ex: CACHE_TTL_SECONDS },
				}),
			context.db
				.select({ value: count() })
				.from(generations)
				.where(
					and(
						eq(generations.owner, userId),
						eq(generations.type, "conversation"),
						between(generations.createdAt, currentPeriodStart, currentPeriodEnd)
					)
				)
				.$withCache({
					tag: viewerUsageTag(userId, "conversation_generations_per_cycle"),
					config: { ex: CACHE_TTL_SECONDS },
				}),
			context.db
				.select({ value: count() })
				.from(resumeAnalyses)
				.where(
					and(
						eq(resumeAnalyses.userId, userId),
						between(resumeAnalyses.createdAt, currentPeriodStart, currentPeriodEnd)
					)
				)
				.$withCache({
					tag: viewerUsageTag(userId, "resume_analyses_per_cycle"),
					config: { ex: CACHE_TTL_SECONDS },
				}),
			context.db
				.select({ value: count() })
				.from(coachingSessions)
				.where(
					and(
						eq(coachingSessions.userId, userId),
						between(coachingSessions.createdAt, currentPeriodStart, currentPeriodEnd)
					)
				)
				.$withCache({
					tag: viewerUsageTag(userId, "coaching_sessions_per_cycle"),
					config: { ex: CACHE_TTL_SECONDS },
				}),
			context.db
				.select({ value: count() })
				.from(resumes)
				.where(eq(resumes.userId, userId))
				.$withCache({
					tag: viewerUsageTag(userId, "resumes_total"),
					config: { ex: CACHE_TTL_SECONDS },
				}),
		]);

		if (
			resumeCreationGens.status === "rejected" ||
			conversationGens.status === "rejected" ||
			analyses.status === "rejected" ||
			coaching.status === "rejected" ||
			totalResumes.status === "rejected"
		) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "No se pudo encontrar uso para alguno de los modelos",
			});
		}

		const usage = {
			resumes_total: totalResumes.value[0]?.value ?? 0,
			resume_creation_generations_per_cycle: resumeCreationGens.value[0]?.value ?? 0,
			conversation_generations_per_cycle: conversationGens.value[0]?.value ?? 0,
			resume_analyses_per_cycle: analyses.value[0]?.value ?? 0,
			coaching_sessions_per_cycle: coaching.value[0]?.value ?? 0,
		};

		const remaining = {
			resumes_total: remainingQuota(entitlements.resumes_total, usage.resumes_total),
			resume_creation_generations_per_cycle: remainingQuota(
				entitlements.resume_creation_generations_per_cycle,
				usage.resume_creation_generations_per_cycle
			),
			conversation_generations_per_cycle: remainingQuota(
				entitlements.conversation_generations_per_cycle,
				usage.conversation_generations_per_cycle
			),
			resume_analyses_per_cycle: remainingQuota(
				entitlements.resume_analyses_per_cycle,
				usage.resume_analyses_per_cycle
			),
			coaching_sessions_per_cycle: remainingQuota(
				entitlements.coaching_sessions_per_cycle,
				usage.coaching_sessions_per_cycle
			),
		} satisfies Record<keyof typeof usage, LimitValue | typeof unlimitedSentinel | number>;

		return {
			subscription: {
				id: subscription.id,
				planId: subscription.planId,
				status: subscription.status,
				provider: subscription.provider,
				currentPeriodStart,
				currentPeriodEnd,
				cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			},
			plan: {
				id: plan.id,
				displayName: plan.displayName,
			},
			entitlements,
			usage,
			remaining,
		};
	}),

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

import { createDb } from "@stackk-career/db";
import * as schema from "@stackk-career/db/schema/auth";
import { userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import { env } from "@stackk-career/env/server";
import { createMonthlyPeriod } from "@stackk-career/schemas/subscriptions";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { log } from "evlog";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		appName: "Stackk Career",

		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		session: {
			cookieCache: {
				enabled: true,
			},
		},
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [tanstackStartCookies()],
		hooks: {
			after: createAuthMiddleware(async (ctx) => {
				const newSession = ctx.context.newSession;
				if (!newSession) {
					return;
				}

				const { currentPeriodStart, currentPeriodEnd } = createMonthlyPeriod();

				try {
					await db
						.insert(userSubscriptions)
						.values({
							userId: newSession.user.id,
							planId: "free",
							status: "active",
							provider: "system",
							currentPeriodStart,
							currentPeriodEnd,
						})
						.onConflictDoNothing({ target: userSubscriptions.userId });
				} catch (err) {
					log.error({
						auth: { action: "bootstrap_free_subscription", userId: newSession.user.id },
						error: toError(err),
					});
				}
			}),
		},
		logger: {
			level: "warn",
			log: (level, message, ...args) => {
				const payload = { auth: { source: "better-auth", message, args } };

				if (level === "error") {
					log.error(payload);
					return;
				}

				if (level === "warn") {
					log.warn(payload);
				}
			},
		},
		onAPIError: {
			onError: (error, ctx) => {
				const err = toError(error);

				log.error({
					auth: {
						action: "api_error",
						path: (ctx as { path?: string } | undefined)?.path,
					},
					error: { message: err.message, name: err.name, stack: err.stack },
				});
			},
		},
	});
}

export const auth = createAuth();

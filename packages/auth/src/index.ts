import { createDb } from "@stackk-career/db";
import * as schema from "@stackk-career/db/schema/auth";
import { userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import { env } from "@stackk-career/env/server";
import type { sendWelcomeEmailTask } from "@stackk-career/jobs/trigger/tasks/send-welcome-email";
import { createMonthlyPeriod } from "@stackk-career/schemas/subscriptions";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { tasks } from "@trigger.dev/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { log } from "evlog";
import { getServerPostHog } from "./posthog";

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
		databaseHooks: {
			user: {
				create: {
					// Fire-and-forget welcome email. `tasks.trigger` only enqueues over HTTP
					// (~ms) and errors are swallowed, so signup never blocks on or fails from
					// email delivery — the send itself runs in the `send-welcome-email` task.
					after: async (createdUser) => {
						try {
							await tasks.trigger<typeof sendWelcomeEmailTask>("send-welcome-email", {
								userId: createdUser.id,
								email: createdUser.email,
								name: createdUser.name,
							});
						} catch (err) {
							log.error({
								auth: { action: "enqueue_welcome_email", userId: createdUser.id },
								error: toError(err),
							});
						}

						// Backend-independent signup signal: tracked even if the client never
						// returns from the OAuth redirect to fire `signed_up`. `$set` seeds the
						// person profile so it matches the client-side identify() call.
						try {
							getServerPostHog()?.capture({
								distinctId: createdUser.id,
								event: "signed_up",
								properties: {
									source: "server",
									$set: {
										email: createdUser.email,
										name: createdUser.name,
										plan: "free",
										subscription_status: "active",
										is_paid: false,
									},
								},
							});
						} catch (err) {
							log.error({
								auth: { action: "posthog_signed_up", userId: createdUser.id },
								error: toError(err),
							});
						}
					},
				},
			},
		},
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

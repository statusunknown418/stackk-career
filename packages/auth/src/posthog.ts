import { PostHog } from "posthog-node";

let client: PostHog | null = null;

/**
 * Process-wide singleton posthog-node client for the auth package.
 *
 * Duplicated from `@stackk-career/api` on purpose: `api` already depends on
 * `auth`, so importing the other way would create a cycle, and neither the
 * `env` nor `schemas` package is the right home for a runtime analytics client.
 *
 * Returns `null` when the token is unset (graceful degrade). NEVER `shutdown()`
 * per call — see the api copy for the singleton/flush rationale.
 */
export function getServerPostHog(): PostHog | null {
	const key = process.env.VITE_PUBLIC_POSTHOG_KEY;
	if (!key) {
		return null;
	}
	if (!client) {
		client = new PostHog(key, {
			host: process.env.VITE_PUBLIC_POSTHOG_HOST,
			flushAt: 1,
			flushInterval: 0,
		});
	}
	return client;
}

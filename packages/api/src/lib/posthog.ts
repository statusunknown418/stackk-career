import { PostHog } from "posthog-node";

let client: PostHog | null = null;

/**
 * Process-wide singleton posthog-node client for server-side capture.
 *
 * Returns `null` when the project token is unset so analytics degrades
 * gracefully instead of throwing. The token is read from `process.env` (the
 * `VITE_`-prefixed var is intentionally shared between client and server; it is
 * a public key). `@stackk-career/env/server` can't validate it because t3-env
 * forbids client-prefixed keys in the server schema.
 *
 * NEVER call `shutdown()` per request — that would destroy the singleton. The
 * long-lived Nitro server flushes batches in the background; `flushAt: 1` keeps
 * low-volume server events from sitting in the buffer.
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

import { auth } from "@stackk-career/auth";
import type { RequestLogger } from "evlog";
import { createAuthIdentifier } from "evlog/better-auth";
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
	const identify = createAuthIdentifier(auth, {
		maskEmail: true,
		exclude: ["/api/auth/**", "/api/_evlog/**"],
	});

	nitroApp.hooks.hook("request", async (event) => {
		const ctx = (event as unknown as { context?: { log?: RequestLogger } }).context;
		if (!ctx?.log) {
			return;
		}
		await identify({
			path: new URL(event.req.url).pathname,
			headers: event.req.headers,
			context: ctx,
		});
	});
});

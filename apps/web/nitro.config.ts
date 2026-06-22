import evlog from "evlog/nitro/v3";
import { defineConfig } from "nitro/config";

export default defineConfig({
	experimental: {
		asyncContext: true,
	},
	preset: "vercel",
	// Reverse-proxy PostHog through a first-party path so ad blockers (which key
	// off *.posthog.com) don't drop client pageviews/autocapture. On the Vercel
	// preset these external proxies compile to CDN-level rewrites — no function
	// invocation. Most-specific rule first; static assets live on a separate host.
	routeRules: {
		"/ingest/static/**": { proxy: "https://us-assets.i.posthog.com/static/**" },
		"/ingest/**": { proxy: "https://us.i.posthog.com/**" },
	},
	plugins: ["./server/plugins/evlog-drain.ts", "./server/plugins/evlog-auth.ts"],
	modules: [
		evlog({
			env: { service: "stackk-career-web" },
		}),
	],
});

import { PostHogProvider, usePostHog } from "@posthog/react";
import { env } from "@stackk-career/env/web";
import { type ReactNode, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * sessionStorage flag set on the /login page before the OAuth redirect. The app
 * uses Better-Auth Google sign-in (a full redirect off-domain and back), so
 * there is no client-side "auth resolved" callback to hook. The flag survives
 * the same-tab redirect and is consumed by `AnalyticsBridge` once the restored
 * session is available — that is the real "sign-up conversion" moment.
 */
const PENDING_SIGNUP_KEY = "ph_pending_signup";

/** Arm the sign-up conversion capture. Called right before `signIn.social`. */
export function markPendingSignup(): void {
	try {
		sessionStorage.setItem(PENDING_SIGNUP_KEY, "1");
	} catch {
		// Private-mode / disabled storage — analytics is best-effort, never fatal.
	}
}

/** Disarm the flag when the sign-in attempt fails before leaving the page. */
export function clearPendingSignup(): void {
	try {
		sessionStorage.removeItem(PENDING_SIGNUP_KEY);
	} catch {
		// Ignore — see `markPendingSignup`.
	}
}

/**
 * Renders nothing. Lives inside the provider and drives the PostHog client
 * behaviour that isn't automatic: user identification and the sign-up event.
 * (Pageviews are captured automatically — see `capture_pageview` in
 * `AnalyticsProvider`.)
 */
function AnalyticsBridge() {
	const posthog = usePostHog();
	const { data: sessionData } = authClient.useSession();
	const user = sessionData?.user;

	// Identify on session restore *and* after login. Runs whenever the resolved
	// user changes; `identify` is idempotent, so re-running is safe and ensures
	// pageviews are attributed to the correct person.
	useEffect(() => {
		if (!(posthog && user)) {
			return;
		}
		posthog.identify(user.id, { email: user.email, name: user.name });
	}, [posthog, user]);

	// Sign-up conversion. When a session appears and the /login flag is set, the
	// user just completed auth started on the login page. Identify *before*
	// capturing so the event is attributed to the right person, then clear the
	// flag so it fires once. Kept client-side to preserve anonymous→identified
	// session continuity.
	useEffect(() => {
		if (!(posthog && user)) {
			return;
		}
		if (sessionStorage.getItem(PENDING_SIGNUP_KEY) !== "1") {
			return;
		}
		clearPendingSignup();
		posthog.identify(user.id, { email: user.email, name: user.name });
		posthog.capture("signed_up", { $pathname: "/login" });
	}, [posthog, user]);

	return null;
}

/**
 * Client-only PostHog provider. On the server and the first hydration render it
 * renders children alone (identical DOM → hydration-safe), then mounts the real
 * provider after mount so posthog-js never initialises during SSR. No-ops when
 * the public project token is absent.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const apiKey = env.VITE_PUBLIC_POSTHOG_KEY;

	if (!(mounted && apiKey)) {
		return <>{children}</>;
	}

	return (
		<PostHogProvider
			apiKey={apiKey}
			options={{
				// First-party path (reverse-proxied to PostHog in nitro.config.ts) so
				// ad blockers keying off *.posthog.com don't drop client pageviews.
				// Relative → posthog-js prepends window.location.origin (client only).
				api_host: "/ingest",
				// Direct PostHog host so dashboard links, toolbar and quota checks
				// still resolve; only ingestion/assets traffic goes through the proxy.
				ui_host: "https://us.posthog.com",
				defaults: "2026-01-30",
				// Automatic pageviews. `'history_change'` makes posthog-js patch the
				// History API (pushState/replaceState) and listen for popstate, so
				// TanStack Router's client-side navigations are captured automatically
				// alongside the initial hard load — no manual router subscription.
				capture_pageview: "history_change",
				capture_exceptions: true,
			}}
		>
			<AnalyticsBridge />
			{children}
		</PostHogProvider>
	);
}

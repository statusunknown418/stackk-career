import { PostHogProvider, usePostHog } from "@posthog/react";
import { env } from "@stackk-career/env/web";
import { useRouter } from "@tanstack/react-router";
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
 * Renders nothing. Lives inside the provider and drives every PostHog-specific
 * client behaviour: SPA pageviews, user identification, and the sign-up event.
 */
function AnalyticsBridge() {
	const posthog = usePostHog();
	const router = useRouter();
	const { data: sessionData } = authClient.useSession();
	const user = sessionData?.user;

	// SPA pageviews. TanStack Router navigates via the History API; we disable
	// PostHog's own pageview capture (see `AnalyticsProvider`) and emit one
	// manually on the initial mount plus every resolved client-side navigation,
	// so each route change is counted exactly once.
	useEffect(() => {
		if (!posthog) {
			return;
		}

		const capturePageview = () => {
			posthog.capture("$pageview", {
				$current_url: window.location.href,
				$pathname: window.location.pathname,
			});
		};

		capturePageview();
		// `router.subscribe` returns its own unsubscribe function.
		return router.subscribe("onResolved", capturePageview);
	}, [posthog, router]);

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
				api_host: env.VITE_PUBLIC_POSTHOG_HOST,
				defaults: "2026-01-30",
				// We capture pageviews manually on the router's `onResolved` event
				// (see `AnalyticsBridge`); disabling the automatic SPA capture that
				// `defaults` enables prevents double-counting navigations.
				capture_pageview: false,
			}}
		>
			<AnalyticsBridge />
			{children}
		</PostHogProvider>
	);
}

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_CAL_COM_CV_ANALYSIS_LINK: z.string().min(1).optional(),
		VITE_CAL_COM_FOLLOW_UP_LINK: z.string().min(1).optional(),
		VITE_CAL_COM_GENERAL_COACHING_LINK: z.string().min(1).optional(),
		VITE_CAL_COM_ORIGIN: z.url().optional(),
		VITE_CAL_COM_PRE_INTERVIEW_LINK: z.string().min(1).optional(),

		VITE_MERCADOPAGO_PUBLIC_KEY: z.string().min(1),

		// PostHog: the project token is a *public* client key (safe to ship to the
		// browser). Optional so the app boots without analytics configured; the
		// provider no-ops when the key is absent.
		VITE_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
		VITE_PUBLIC_POSTHOG_HOST: z.url().optional(),
	},
	runtimeEnv: (import.meta as unknown as { env: Record<string, string> }).env,
	emptyStringAsUndefined: true,
});

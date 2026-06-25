import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEnv } from "@t3-oss/env-core";
import { config } from "dotenv";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(here, "../../../.env");
config({ path: rootEnv, quiet: true });

const skipValidation =
	process.env.NODE_ENV !== "production" &&
	(process.env.SKIP_ENV_VALIDATION === "true" || process.env.TRIGGER_INDEXING === "1");

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		DATABASE_AUTH_TOKEN: z.string().min(1),
		UPSTASH_REDIS_REST_URL: z.string().nonempty(),
		UPSTASH_REDIS_REST_TOKEN: z.string().nonempty(),

		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		AI_GATEWAY_API_KEY: z.string().min(1),
		UPLOADTHING_TOKEN: z.string().min(1),

		// LinkedIn job fetch (Apify). Optional: when unset, the background fetch records a
		// `failed` job target and the resume stays fully usable without job context.
		APIFY_TOKEN: z.string().optional(),
		APIFY_LINKEDIN_JOB_ACTOR: z.string().optional(),

		TRIGGER_SECRET_KEY: z.string().min(1),
		TRIGGER_PROJECT_ID: z.string().min(1),

		AXIOM_API_TOKEN: z.string().optional(),
		AXIOM_DATASET: z.string().optional(),

		AGENT_QUEUE_CONCURRENCY: z.coerce.number().default(10),

		CAL_WEBHOOK_SECRET: z.string().min(1),

		RESEND_API_KEY: z.string().min(1),
		EMAIL_FROM: z.string().min(1),
		// Resend webhook signing secret (`whsec_…`) from the webhook's detail page.
		// Verifies inbound delivery/bounce/complaint events before they reach PostHog.
		RESEND_WEBHOOK_SECRET: z.string().min(1),

		MERCADOPAGO_ACCESS_TOKEN: z.string().min(1),
		MERCADOPAGO_PUBLIC_KEY: z.string().min(1),
		MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1),
		MERCADOPAGO_PRO_MONTHLY_PLAN_ID: z.string().min(1),
		MERCADOPAGO_MAX_MONTHLY_PLAN_ID: z.string().min(1),
	},
	runtimeEnv: process.env,
	skipValidation,
	emptyStringAsUndefined: true,
});

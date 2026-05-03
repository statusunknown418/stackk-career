import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEnv } from "@t3-oss/env-core";
import { config } from "dotenv";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(here, "../../../.env");
config({ path: rootEnv, quiet: true });

const skipValidation = process.env.SKIP_ENV_VALIDATION === "true" || process.env.TRIGGER_INDEXING === "1";

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

		TRIGGER_SECRET_KEY: z.string().min(1),
		TRIGGER_PROJECT_ID: z.string().min(1),

		AXIOM_API_TOKEN: z.string().nonempty(),
		AXIOM_DATASET: z.string().nonempty(),
	},
	runtimeEnv: process.env,
	skipValidation,
	emptyStringAsUndefined: true,
});

import { createClient } from "@libsql/client";
import { env } from "@stackk-career/env/server";
import { upstashCache } from "drizzle-orm/cache/upstash";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

/**
 * @description Main DB connection setup - used on the api and anywhere else OUTSIDE of the `packages/job`
 */
export function createDb() {
	const client = createClient({
		url: env.DATABASE_URL,
		authToken: env.DATABASE_AUTH_TOKEN,
	});

	return drizzle({
		client,
		schema,
		cache: upstashCache({
			url: env.UPSTASH_REDIS_REST_URL,
			token: env.UPSTASH_REDIS_REST_TOKEN,
		}),
	});
}

export const db = createDb();

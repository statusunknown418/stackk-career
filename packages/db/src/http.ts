import { createClient } from "@libsql/client/http";
import { env } from "@stackk-career/env/server";
import { upstashCache } from "drizzle-orm/cache/upstash";
import { drizzle } from "drizzle-orm/libsql/http";

import * as schema from "./schema";

/**
 * @description Drizzle client for serverless/job runtimes that must not import the native
 * libSQL SQLite binding at module load time.
 *
 * The default DB client in `src/index.ts` uses `@libsql/client`, whose Node
 * entrypoint statically imports the local SQLite driver. Trigger.dev indexes
 * task files inside a Linux build container before tasks run; that import path
 * makes the native `@libsql/linux-*` optional package mandatory during indexing
 * and can abort deployments even though jobs only talk to remote Turso.
 *
 * This client uses the HTTP-only libSQL and Drizzle entrypoints so jobs keep the
 * same schema and cache behavior without requiring platform-specific native
 * SQLite packages in the Trigger deployment image.
 *
 * Keep this client lazy. Trigger.dev imports task modules during deployment
 * indexing without user runtime env vars like `DATABASE_URL`; constructing the
 * client at module scope would make indexing fail before any task runs.
 */
export function createTriggerDb() {
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

type TriggerDb = ReturnType<typeof createTriggerDb>;

let triggerDb: TriggerDb | undefined;

export function getTriggerDb(): TriggerDb {
	triggerDb ??= createTriggerDb();
	return triggerDb;
}

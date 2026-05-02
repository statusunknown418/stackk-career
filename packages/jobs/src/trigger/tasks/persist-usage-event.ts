import { db } from "@stackk-career/db";
import { usageEvents } from "@stackk-career/db/schema/usage-events";
import { persistUsageEventInputSchema } from "@stackk-career/schemas/jobs/usage-events";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { usageEventQueue } from "../queues";

export const persistUsageEventTask = schemaTask({
	id: "persist-usage-event",
	queue: usageEventQueue,
	schema: persistUsageEventInputSchema,
	machine: { preset: "micro" },
	retry: {
		maxAttempts: 5,
		factor: 2,
		minTimeoutInMs: 500,
		maxTimeoutInMs: 30_000,
	},
	run: async (payload) => {
		const [row] = await db.insert(usageEvents).values(payload).returning({ id: usageEvents.id });

		logger.info("usage-event = persisted", {
			id: row?.id,
			kind: payload.kind,
			provider: payload.provider,
			model: payload.model,
			totalTokens: payload.totalTokens,
			metadata: payload.metadata,
		});

		return { id: row?.id ?? null };
	},
});

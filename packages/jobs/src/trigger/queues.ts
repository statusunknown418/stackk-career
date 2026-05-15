import { env } from "@stackk-career/env/server";
import { queue } from "@trigger.dev/sdk";

export const agentQueue = queue({
	name: "ai-agents",
	concurrencyLimit: env.AGENT_QUEUE_CONCURRENCY,
});

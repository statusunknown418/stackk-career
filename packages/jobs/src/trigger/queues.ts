import { queue } from "@trigger.dev/sdk";

export const agentQueue = queue({
	name: "ai-agents",
	concurrencyLimit: Number(process.env.AGENT_QUEUE_CONCURRENCY ?? 10),
});

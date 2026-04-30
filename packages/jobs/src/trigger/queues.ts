import { queue } from "@trigger.dev/sdk";

export const agentQueue = queue({
	name: "ai-agents",
	concurrencyLimit: 10,
});

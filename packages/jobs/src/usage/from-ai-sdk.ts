import type { UsageEventKind } from "@stackk-career/db/schema/usage-events";
import type { PersistUsageEventInput } from "@stackk-career/schemas/jobs/usage-events";
import type { LanguageModelUsage } from "ai";

export interface BuildUsageEventRowInput {
	kind: UsageEventKind;
	metadata?: Record<string, unknown>;
	modelId: string;
	usage: LanguageModelUsage | undefined;
	userId?: string | null;
}

export function buildUsageEventRow({
	usage,
	kind,
	modelId,
	userId,
	metadata,
}: BuildUsageEventRowInput): PersistUsageEventInput | null {
	if (!usage) {
		return null;
	}

	const slashIndex = modelId.indexOf("/");
	const provider = slashIndex >= 0 ? modelId.slice(0, slashIndex) : "unknown";
	const model = slashIndex >= 0 ? modelId.slice(slashIndex + 1) : modelId;

	const inputTokens = usage.inputTokens ?? 0;
	const outputTokens = usage.outputTokens ?? 0;
	const reasoningTokens = usage.reasoningTokens ?? 0;
	const totalTokens = usage.totalTokens ?? inputTokens + outputTokens + reasoningTokens;

	return {
		userId,
		kind,
		provider,
		model,
		inputTokens,
		outputTokens,
		totalTokens,
		reasoningTokens,
		metadata,
	};
}

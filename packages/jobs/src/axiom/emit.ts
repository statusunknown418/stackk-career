import { logger } from "@trigger.dev/sdk";
import type { LanguageModel, LanguageModelUsage } from "ai";

export type UsageEventKind = "chat" | "object" | "embed" | "image" | "tool";

export interface EmitUsageEventInput {
	kind: UsageEventKind;
	metadata?: Record<string, unknown>;
	modelId: LanguageModel;
	usage: LanguageModelUsage | undefined;
	userId?: string | null;
}

interface AxiomPayload {
	_time: string;
	inputTokens: number;
	kind: UsageEventKind;
	metadata?: Record<string, unknown>;
	model: LanguageModel;
	outputTokens: number;
	provider: string;
	reasoningTokens: number;
	totalTokens: number;
	userId: string | null;
}

function splitModel(modelId: LanguageModel): { provider: string; model: LanguageModel } {
	const slash = modelId.toString().indexOf("/");
	if (slash < 0) {
		return { provider: "unknown", model: modelId };
	}
	return { provider: modelId.toString().slice(0, slash), model: modelId.toString().slice(slash + 1) };
}

function buildPayload({ usage, kind, modelId, userId, metadata }: EmitUsageEventInput): AxiomPayload | null {
	if (!usage) {
		return null;
	}
	const { provider, model } = splitModel(modelId);
	const inputTokens = usage.inputTokens ?? 0;
	const outputTokens = usage.outputTokens ?? 0;
	const reasoningTokens = usage.reasoningTokens ?? 0;
	const totalTokens = usage.totalTokens ?? inputTokens + outputTokens + reasoningTokens;

	return {
		_time: new Date().toISOString(),
		kind,
		provider,
		model,
		userId: userId ?? null,
		inputTokens,
		outputTokens,
		reasoningTokens,
		totalTokens,
		metadata,
	};
}

export async function emitUsageEvent(input: EmitUsageEventInput): Promise<void> {
	const payload = buildPayload(input);
	if (!payload) {
		logger.warn("usage-event = skipped_no_usage", { kind: input.kind, modelId: input.modelId });
		return;
	}

	const token = process.env.AXIOM_API_TOKEN ?? process.env.AXIOM_TOKEN;
	const dataset = process.env.AXIOM_DATASET;

	if (!(token && dataset)) {
		logger.info("usage-event = recorded_local", { ...payload });
		return;
	}

	const url = `https://api.axiom.co/v1/datasets/${encodeURIComponent(dataset)}/ingest`;

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify([payload]),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "Error");
			logger.warn("usage-event = axiom_failed", { status: res.status, body: text });
			return;
		}

		logger.info("usage-event = axiom_sent", {
			kind: payload.kind,
			provider: payload.provider,
			model: payload.model,
			totalTokens: payload.totalTokens,
		});
	} catch (err) {
		logger.warn("usage-event = axiom_error", { error: err instanceof Error ? err.message : String(err) });
	}
}

import { ORPCError } from "@orpc/server";
import { createManualEmitter, forkRequestLog, toError } from "@stackk-career/api/logging";
import {
	type PrepareSuggestionOutput,
	suggestResumeBlockInputSchema,
	suggestResumeBlockOutputSchema,
} from "@stackk-career/schemas/api/suggestions";
import { createFileRoute } from "@tanstack/react-router";
import { gateway, Output, streamText } from "ai";
import { createAILogger } from "evlog/ai";
import { readRequestLog } from "@/lib/request-log";
import { client } from "@/utils/orpc";

const handlePost = async ({ request }: { request: Request }) => {
	const parentLog = readRequestLog();

	const json = await request.json();
	const parsed = suggestResumeBlockInputSchema.safeParse(json);
	if (!parsed.success) {
		return new Response("Invalid input", { status: 400 });
	}

	const prepStart = performance.now();

	let prep: PrepareSuggestionOutput;
	try {
		prep = await client.suggestions.prepareSuggestion(parsed.data);
	} catch (err) {
		if (err instanceof ORPCError && err.code === "UNAUTHORIZED") {
			return new Response("Unauthorized", { status: 401 });
		}

		throw err;
	}

	const prepDurationMs = Math.round(performance.now() - prepStart);

	const streamLog = parentLog
		? forkRequestLog({
				parent: parentLog,
				method: "stream",
				operation: "ai.suggestResumeBlockContent",
				path: "api/resume-suggestions",
			})
		: null;

	const emitStreamLog = streamLog ? createManualEmitter(streamLog) : () => undefined;

	streamLog?.set({
		user: { id: prep.userId },
		generation: { id: prep.generationId },
		resume: { id: parsed.data.resumeId },
		prep: { durationMs: prepDurationMs },
	});

	const ai = streamLog ? createAILogger(streamLog) : null;
	const model = gateway(prep.model);

	const result = streamText({
		model: ai ? ai.wrap(model) : model,
		system: prep.system,
		prompt: prep.prompt,
		output: Output.object({ schema: suggestResumeBlockOutputSchema }),
		abortSignal: request.signal,
		providerOptions: {
			gateway: {
				user: prep.userId,
				tags: ["feature:resume-suggestions", `env:${process.env.NODE_ENV ?? "development"}`],
			},
		},
		onFinish: async ({ usage, finishReason }) => {
			let suggestions: { html: string }[] = [];
			try {
				const out = await result.output;
				suggestions = out?.suggestions ?? [];
			} catch {
				suggestions = [];
			}
			await client.suggestions.recordSuggestionCompletion({
				generationId: prep.generationId,
				suggestions,
				usage,
				finishReason,
			});
			emitStreamLog({ outcome: suggestions.length > 0 ? "completed" : "empty_object" });
		},
		onError: async ({ error }) => {
			const err = toError(error);
			streamLog?.error(err);
			await client.suggestions.recordSuggestionError({
				generationId: prep.generationId,
				errorMessage: err.message,
			});
			emitStreamLog({ outcome: "stream_error" });
		},
	});

	return result.toTextStreamResponse();
};

export const Route = createFileRoute("/api/resume-suggestions")({
	server: {
		handlers: {
			POST: handlePost,
		},
	},
});

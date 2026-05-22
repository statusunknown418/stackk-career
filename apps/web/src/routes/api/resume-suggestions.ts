import { ORPCError } from "@orpc/server";
import {
	type PrepareSuggestionOutput,
	suggestResumeBlockInputSchema,
	suggestResumeBlockOutputSchema,
} from "@stackk-career/schemas/api/suggestions";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { createFileRoute } from "@tanstack/react-router";
import { gateway, Output, streamText } from "ai";
import { createAILogger } from "evlog/ai";
import { getRequestLog } from "@/lib/request-log";
import { client } from "@/utils/orpc";

const handlePost = async ({ request }: { request: Request }) => {
	const requestLog = getRequestLog();

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

	requestLog?.set({
		operation: "ai.suggestResumeBlockContent",
		user: { id: prep.userId },
		generation: { id: prep.generationId },
		resume: { id: parsed.data.resumeId },
		prep: { durationMs: prepDurationMs },
	});

	const ai = createAILogger(requestLog);

	const result = streamText({
		model: ai.wrap(gateway(prep.model)),
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
			let suggestions: { label: string; html: string }[] = [];
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
			requestLog.set({
				ai: ai.getMetadata(),
				finishReason,
				outcome: suggestions.length > 0 ? "completed" : "empty_object",
				suggestions: { count: suggestions.length },
			});
		},
		onError: async ({ error }) => {
			const err = toError(error);
			await client.suggestions.recordSuggestionError({
				generationId: prep.generationId,
				errorMessage: err.message,
			});
			requestLog.error(err, {
				ai: ai.getMetadata(),
				outcome: "stream_error",
			});
		},
		onAbort: () => {
			requestLog.set({
				ai: ai.getMetadata(),
				outcome: "aborted",
			});
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

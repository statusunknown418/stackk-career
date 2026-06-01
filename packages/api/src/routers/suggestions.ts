import { ORPCError } from "@orpc/server";
import { messages } from "@stackk-career/db/schema/messages";
import { resumes } from "@stackk-career/db/schema/resumes";
import {
	prepareSuggestionOutputSchema,
	recordSuggestionCompletionInputSchema,
	recordSuggestionErrorInputSchema,
	suggestResumeBlockInputSchema,
} from "@stackk-career/schemas/api/suggestions";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "..";
import { buildSuggestionPrompt, loadResumeContext, RESUME_SUGGESTIONS_MODEL_SLUG } from "../lib/resume-suggestions";
import { assertSingleQuota } from "../services/subscriptions";

const MAX_ERROR_LEN = 1000;

export const suggestionsRouter = {
	prepareSuggestion: protectedProcedure
		.input(suggestResumeBlockInputSchema)
		.output(prepareSuggestionOutputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "prepare_resume_suggestion",
				user: { id: userId },
				ai: { model: RESUME_SUGGESTIONS_MODEL_SLUG },
				block: { type: input.blockType, field: input.field, id: input.blockId ?? null },
				resume: { id: input.resumeId },
			});

			const [resume] = await context.db
				.select({ id: resumes.id, generationId: resumes.generationId, userId: resumes.userId })
				.from(resumes)
				.where(eq(resumes.id, input.resumeId))
				.$withCache();

			if (!resume || resume.userId !== userId) {
				context.log?.set({ outcome: "resume_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "CV no encontrado" });
			}

			// A suggestion writes a counted `isAssistant: false` message on the resume's generation, so it
			// consumes `messages_per_generation` exactly like `messages.create` — gate before doing the work.
			await assertSingleQuota(context.db, userId, "messages_per_generation", { generationId: resume.generationId });

			const { profile, blocks } = await loadResumeContext(context, userId, input.resumeId);
			const { system, prompt } = buildSuggestionPrompt({ input, profile, blocks });

			const [userMessage] = await context.db
				.insert(messages)
				.values({
					generationId: resume.generationId,
					isAssistant: false,
					objectType: "resume-suggestion",
					content: { input, system, prompt },
				})
				.returning({ id: messages.id });

			context.log?.set({
				generation: { id: resume.generationId },
				userMessage: { id: userMessage?.id ?? null },
				outcome: "prepared",
			});

			return {
				system,
				prompt,
				generationId: resume.generationId,
				userMessageId: userMessage?.id ?? null,
				model: RESUME_SUGGESTIONS_MODEL_SLUG,
				userId,
			};
		}),

	recordSuggestionCompletion: protectedProcedure
		.input(recordSuggestionCompletionInputSchema)
		.handler(async ({ context, input }) => {
			context.log?.set({
				action: "record_suggestion_completion",
				user: { id: context.session.user.id },
				generation: { id: input.generationId },
				ai: {
					model: RESUME_SUGGESTIONS_MODEL_SLUG,
					finishReason: input.finishReason,
					suggestionsCount: input.suggestions.length,
					inputTokens: input.usage?.inputTokens,
					outputTokens: input.usage?.outputTokens,
					totalTokens: input.usage?.totalTokens,
				},
				outcome: input.suggestions.length > 0 ? "completed" : "empty_object",
			});

			await context.db.insert(messages).values({
				generationId: input.generationId,
				isAssistant: true,
				objectType: "resume-suggestion",
				model: RESUME_SUGGESTIONS_MODEL_SLUG,
				error: null,
				object: {
					suggestions: input.suggestions,
					usage: input.usage ?? null,
					finishReason: input.finishReason,
					error: null,
				},
			});

			return { ok: true };
		}),

	recordSuggestionError: protectedProcedure
		.input(recordSuggestionErrorInputSchema)
		.handler(async ({ context, input }) => {
			const truncated = input.errorMessage.slice(0, MAX_ERROR_LEN);

			context.log?.set({
				action: "record_suggestion_error",
				user: { id: context.session.user.id },
				generation: { id: input.generationId },
				ai: { model: RESUME_SUGGESTIONS_MODEL_SLUG },
				outcome: "stream_error",
				error: truncated,
			});

			context.log?.error(toError(new Error(truncated)));

			await context.db.insert(messages).values({
				generationId: input.generationId,
				isAssistant: true,
				objectType: "resume-suggestion",
				model: RESUME_SUGGESTIONS_MODEL_SLUG,
				error: truncated,
				object: { suggestions: [], usage: null, finishReason: "error", error: truncated },
			});

			return { ok: true };
		}),
};

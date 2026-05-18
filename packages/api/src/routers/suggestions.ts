import { ORPCError, streamToEventIterator } from "@orpc/server";
import { suggestResumeBlockInputSchema } from "@stackk-career/schemas/api/suggestions";
import { protectedProcedure } from "..";
import { createResumeSuggestionsStream } from "../lib/resume-suggestions";

export const suggestionsRouter = {
	suggestResumeBlockContent: protectedProcedure
		.input(suggestResumeBlockInputSchema)
		.handler(async ({ context, input }) => {
			try {
				const result = await createResumeSuggestionsStream({
					context,
					input,
					streamPath: "ai/suggest_resume_block_content",
				});

				return streamToEventIterator(result.toUIMessageStream());
			} catch (error) {
				if (error instanceof ORPCError) {
					throw error;
				}

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: error instanceof Error ? error.message : String(error),
				});
			}
		}),
};

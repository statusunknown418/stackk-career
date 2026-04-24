import { streamToEventIterator } from "@orpc/ai-sdk";
import { ORPCError } from "@orpc/server";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { generations } from "@stackk-career/db/schema/generations";
import { createUIMessageStream, streamText, type UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { createAILogger } from "evlog/ai";
import { z } from "zod";
import { AI_MODEL_PRICING } from "../constants";
import { protectedProcedure } from "../index";
import { createCorrelatedRequestLog, createRequestLogEmitter, toError } from "../logging";

export type AnalyzeResumeUIMessage = UIMessage;

export const aiRouter = {
	analyzeResume: protectedProcedure
		.input(
			z.object({
				fileId: z.string().nonempty(),
				generationId: z.string().nonempty(),
			})
		)
		.handler(async ({ input, context, signal }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "analyze_resume",
				file: { id: input.fileId },
				generation: { id: input.generationId },
			});

			const [generation] = await context.db
				.select({ id: generations.id })
				.from(generations)
				.where(and(eq(generations.id, input.generationId), eq(generations.owner, userId)))
				.limit(1);

			if (!generation) {
				throw new ORPCError("NOT_FOUND", { message: "Generation not found" });
			}

			const [file] = await context.db
				.select({
					id: fileMetadata.id,
					url: fileMetadata.url,
				})
				.from(fileMetadata)
				.where(and(eq(fileMetadata.id, input.fileId), eq(fileMetadata.userId, userId)))
				.limit(1);

			if (!file) {
				throw new ORPCError("NOT_FOUND", { message: "Resume file not found" });
			}

			const stream = createUIMessageStream<AnalyzeResumeUIMessage>({
				execute: ({ writer }) => {
					const bgLog = createCorrelatedRequestLog({
						method: "POST",
						operation: "analyze_resume_stream",
						parent: context.log,
						path: "/api/rpc",
					});
					const emitBgLog = createRequestLogEmitter(bgLog);

					bgLog.set({
						user: { id: userId },
						file: { id: input.fileId },
						generation: { id: input.generationId },
					});

					try {
						const ai = createAILogger(bgLog, { cost: AI_MODEL_PRICING });

						const result = streamText({
							model: ai.wrap("google/gemini-3-flash"),
							abortSignal: signal,
							system: `
						You are a resume analyst. Your ONLY job is to analyze the attached PDF resume and return specific, actionable suggestions to improve it.
              Hard rules:
              - If the user asks anything unrelated to the attached resume, refuse briefly and redirect.
              - Do not invent experience, skills, or facts. Ground every comment in the PDF content.
              - Output structured Markdown with these sections in order: "Summary", "Strengths", "Weaknesses", "Suggestions", "Rewrite Examples".
              - In "Suggestions" and "Rewrite Examples", reference exact bullets or phrases from the PDF.
              - Focus on: clarity, quantified impact, structure, ATS readability, skills relevance, tone.
              - No generic advice. No filler.

              System language:
              - Provide ALL answers in SPANISH unless explicitly stated otherwise by system override
            `,
							messages: [
								{
									role: "user",
									content: [
										{
											type: "text",
											text: "Analyze the attached resume PDF and return structured suggestions.",
										},
										{
											type: "file",
											data: new URL(file.url),
											mediaType: "application/pdf",
											filename: "resume.pdf",
										},
									],
								},
							],
							onError: () => {
								emitBgLog({ outcome: "error" });
							},
							onFinish: () => {
								emitBgLog({ outcome: "completed" });
							},
							onAbort: () => {
								emitBgLog({
									aborted: true,
									outcome: "aborted",
								});
							},
						});

						writer.merge(result.toUIMessageStream({ sendReasoning: true }));
					} catch (error) {
						bgLog.error(toError(error));
						emitBgLog({ outcome: "error" });
						throw error;
					}
				},
				onError: (error) => {
					context.log?.error(error instanceof Error ? error : "Failed to analyze resume.");

					return error instanceof Error ? error.message : "Failed to analyze resume.";
				},
			});

			return streamToEventIterator(stream);
		}),
};

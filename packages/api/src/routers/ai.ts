import { streamToEventIterator } from "@orpc/ai-sdk";
import { ORPCError } from "@orpc/server";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { createUIMessageStream, type InferUIMessageChunk, streamText, type UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { createRequestLogger } from "evlog";
import { createAILogger } from "evlog/ai";
import { z } from "zod";
import { AI_MODEL_PRICING } from "../constants";
import { protectedProcedure } from "../index";

export type AnalyzePhase = "analyzing" | "complete";

export interface AnalyzeStatus {
	message: string;
	phase: AnalyzePhase;
}

export type AnalyzeResumeUIMessage = UIMessage<
	never,
	{
		status: AnalyzeStatus;
	}
>;

export type AnalyzeResumeChunk = InferUIMessageChunk<AnalyzeResumeUIMessage>;

export const aiRouter = {
	analyzeResume: protectedProcedure
		.input(
			z.object({
				fileId: z.string().nonempty(),
			})
		)
		.handler(async ({ input, context, signal }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "analyze_resume",
				file: { id: input.fileId },
			});

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
					const bgLog = createRequestLogger({
						method: "POST",
					});

					bgLog.set({
						operation: "analyze_resume_stream",
						user: { id: userId },
						file: { id: input.fileId },
					});

					const ai = createAILogger(bgLog, { cost: AI_MODEL_PRICING });

					writer.write({
						type: "data-status",
						id: "analyze-status",
						transient: true,
						data: {
							phase: "analyzing",
							message: "Analyzing resume and drafting suggestions...",
						},
					});

					const result = streamText({
						model: ai.wrap("openai/gpt-5-nano"),
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
              - Answer using markdown for better organization

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
						onFinish: () => {
							writer.write({
								type: "data-status",
								id: "analyze-status",
								transient: true,
								data: {
									phase: "complete",
									message: "Analysis complete.",
								},
							});
						},
						onError: ({ error }) => {
							bgLog.error(error instanceof Error ? error : new Error(String(error)));
						},
					});

					writer.merge(result.toUIMessageStream());
				},
				onError: (error) => (error instanceof Error ? error.message : "Failed to analyze resume."),
			});

			return streamToEventIterator(stream);
		}),
};

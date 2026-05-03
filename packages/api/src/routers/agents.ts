import { ORPCError } from "@orpc/server";
import { createId } from "@paralleldrive/cuid2";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import type { k02FastAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-fast-analysis";
import { initiateResumeAnalysisInputSchema } from "@stackk-career/schemas/api/agents";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../";

export const agentsRouter = {
	initiateResumeAnalysis: protectedProcedure
		.input(initiateResumeAnalysisInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "trigger_resume_agent",
				user: { id: userId },
				generation: { id: input.generationId },
				parentAnalysisId: input.parentAnalysisId,
			});

			const [row] = await context.db
				.select({
					generationId: generations.id,
					pdfUrl: fileMetadata.url,
				})
				.from(generations)
				.leftJoin(fileMetadata, and(eq(fileMetadata.generationId, generations.id), eq(fileMetadata.userId, userId)))
				.where(and(eq(generations.id, input.generationId), eq(generations.owner, userId)))
				.limit(1)
				.$withCache();

			if (!row) {
				context.log?.set({ outcome: "generation_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Generation not found" });
			}

			if (!row.pdfUrl) {
				context.log?.set({ outcome: "resume_file_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Resume file not found for generation" });
			}

			if (input.parentAnalysisId) {
				const [parent] = await context.db
					.select({ id: resumeAnalyses.id })
					.from(resumeAnalyses)
					.where(
						and(
							eq(resumeAnalyses.id, input.parentAnalysisId),
							eq(resumeAnalyses.generationId, input.generationId),
							eq(resumeAnalyses.userId, userId)
						)
					)
					.limit(1);

				if (!parent) {
					context.log?.set({ outcome: "parent_analysis_not_found" });
					throw new ORPCError("NOT_FOUND", { message: "Parent analysis not found" });
				}
			}

			const analysisId = `res_als_${createId()}`;

			try {
				await context.db.insert(resumeAnalyses).values({
					id: analysisId,
					generationId: input.generationId,
					userId,
					parentAnalysisId: input.parentAnalysisId ?? null,
					status: "pending",
				});
			} catch {
				context.log?.set({ outcome: "pending_insert_failed" });
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to register analysis" });
			}

			try {
				const idempotencyKey = await idempotencyKeys.create(`analysis-${analysisId}`);

				const handle = await tasks.trigger<typeof k02FastAnalysisTask>(
					"k02-fast-analysis",
					{
						analysisId,
						generationId: input.generationId,
						userId,
						pdfUrl: row.pdfUrl,
					},
					{
						concurrencyKey: userId,
						idempotencyKey,
						idempotencyKeyTTL: "24h",
						tags: [`user:${userId}`, `gen:${input.generationId}`, `analysis:${analysisId}`, "agent:k02-fast-analysis"],
					}
				);

				context.log?.set({ outcome: "triggered", run: { id: handle.id }, analysis: { id: analysisId } });

				return {
					runId: handle.id,
					analysisId,
					publicAccessToken: handle.publicAccessToken,
				};
			} catch {
				context.log?.set({ outcome: "trigger_failed" });

				await context.db
					.update(resumeAnalyses)
					.set({ status: "failed", error: "trigger_failed" })
					.where(eq(resumeAnalyses.id, analysisId));

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to trigger agent run",
				});
			}
		}),
};

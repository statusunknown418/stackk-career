import { ORPCError } from "@orpc/server";
import { createId } from "@paralleldrive/cuid2";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumes } from "@stackk-career/db/schema/resumes";
import type { k02DetailedAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-detailed-analysis";
import type { k02FastAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-fast-analysis";
import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import {
	triggerDetailedResumeAnalysisInputSchema,
	triggerResumeAnalysisInputSchema,
	triggerResumeParserInputSchema,
} from "@stackk-career/schemas/api/agents";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../";
import { invalidateViewerUsage } from "../lib/viewer-cache";
import { assertMultipleQuotas, assertSingleQuota } from "../services/subscriptions";

export const agentsRouter = {
	triggerK02FastAnalysis: protectedProcedure
		.input(triggerResumeAnalysisInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "trigger_resume_agent",
				user: { id: userId },
				generation: { id: input.generationId },
				parentAnalysisId: input.parentAnalysisId,
			});

			await assertSingleQuota(context.db, userId, "resume_analyses_per_cycle");

			const [row] = await context.db
				.select({
					fileId: fileMetadata.id,
					fileName: fileMetadata.name,
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

			await invalidateViewerUsage(context.db, userId, ["resume_analyses_per_cycle"]);

			try {
				const idempotencyKey = await idempotencyKeys.create(`analysis-${analysisId}`);

				const handle = await tasks.trigger<typeof k02FastAnalysisTask>(
					"k02-fast-analysis",
					{
						analysisId,
						displayName: row.fileName ?? undefined,
						fileId: row.fileId ?? undefined,
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

	triggerK02DetailedAnalysis: protectedProcedure
		.input(triggerDetailedResumeAnalysisInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "trigger_detailed_resume_analysis",
				user: { id: userId },
				resume: { id: input.resumeId },
				parentAnalysisId: input.parentAnalysisId,
			});

			await assertSingleQuota(context.db, userId, "resume_analyses_per_cycle");

			const [resume] = await context.db
				.select({ id: resumes.id, generationId: resumes.generationId })
				.from(resumes)
				.where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)))
				.limit(1)
				.$withCache();

			if (!resume) {
				context.log?.set({ outcome: "resume_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Resume not found" });
			}

			if (input.parentAnalysisId) {
				const [parent] = await context.db
					.select({ id: resumeAnalyses.id })
					.from(resumeAnalyses)
					.where(and(eq(resumeAnalyses.id, input.parentAnalysisId), eq(resumeAnalyses.userId, userId)))
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
					generationId: resume.generationId,
					userId,
					resumeId: resume.id,
					parentAnalysisId: input.parentAnalysisId ?? null,
					status: "pending",
				});
			} catch {
				context.log?.set({ outcome: "pending_insert_failed" });
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to register analysis" });
			}

			await invalidateViewerUsage(context.db, userId, ["resume_analyses_per_cycle"]);

			try {
				const idempotencyKey = await idempotencyKeys.create(`analysis-detailed-${analysisId}`);

				const handle = await tasks.trigger<typeof k02DetailedAnalysisTask>(
					"k02-detailed-analysis",
					{
						analysisId,
						generationId: resume.generationId,
						resumeId: resume.id,
						userId,
						parentAnalysisId: input.parentAnalysisId,
					},
					{
						concurrencyKey: userId,
						idempotencyKey,
						idempotencyKeyTTL: "24h",
						tags: [
							`user:${userId}`,
							`resume:${resume.id}`,
							`gen:${resume.generationId}`,
							`analysis:${analysisId}`,
							"agent:k02-detailed-analysis",
						],
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

	triggerK02ParseResume: protectedProcedure
		.input(triggerResumeParserInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "trigger_resume_parser",
				user: { id: userId },
				fileId: input.fileId ?? null,
				hasFileUrl: Boolean(input.fileUrl),
			});

			// Parsing produces a resume + a `resume-creation` generation, same as `resumes.create`. Gate both
			// limits at this entry point so the upload path can't outrun the per-cycle generation cap.
			await assertMultipleQuotas(context.db, userId, ["resumes_total", "resume_creation_generations_per_cycle"]);

			if (input.fileId) {
				const [file] = await context.db
					.select({ id: fileMetadata.id, url: fileMetadata.url })
					.from(fileMetadata)
					.where(and(eq(fileMetadata.id, input.fileId), eq(fileMetadata.userId, userId)))
					.limit(1)
					.$withCache();

				if (!file) {
					context.log?.set({ outcome: "file_not_found" });
					throw new ORPCError("NOT_FOUND", { message: "File not found" });
				}
			}

			const idempotencySeed = input.fileId ?? input.fileUrl;
			if (!idempotencySeed) {
				throw new ORPCError("BAD_REQUEST", { message: "Missing fileId or fileUrl" });
			}

			try {
				const idempotencyKey = await idempotencyKeys.create(`parser-${userId}-${idempotencySeed}`);

				const handle = await tasks.trigger<typeof resumeParserTask>(
					"resume-parser",
					{
						userId,
						fileId: input.fileId,
						fileUrl: input.fileUrl,
						displayName: input.displayName,
					},
					{
						concurrencyKey: userId,
						idempotencyKey,
						idempotencyKeyTTL: "24h",
						tags: [`user:${userId}`, ...(input.fileId ? [`file:${input.fileId}`] : []), "agent:resume-parser"],
					}
				);

				context.log?.set({ outcome: "triggered", run: { id: handle.id } });

				return {
					runId: handle.id,
					publicAccessToken: handle.publicAccessToken,
				};
			} catch {
				context.log?.set({ outcome: "trigger_failed" });
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to trigger resume parser" });
			}
		}),
};

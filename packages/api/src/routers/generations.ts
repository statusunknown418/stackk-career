import { ORPCError } from "@orpc/server";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { type ResumeAnalysis, resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import {
	createGenerationInputSchema,
	getGenerationInputSchema,
	getResumeAnalysisHistoryInputSchema,
	getResumeAnalysisInputSchema,
	listGenerationsInputSchema,
	type ResumeAnalysisHistoryItem,
} from "@stackk-career/schemas/api/generations";
import type { CachedUsageLimitKey } from "@stackk-career/schemas/subscriptions";
import { and, asc, desc, eq } from "drizzle-orm";
import { protectedProcedure } from "../index";
import { createResumeAnalysisDiff } from "../lib/analysis.helpers";
import { invalidateViewerUsage } from "../lib/viewer-cache";
import { assertSingleQuota } from "../services/subscriptions";

export const generationsRouter = {
	create: protectedProcedure.input(createGenerationInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "create_generation",
			user: { id: userId },
		});

		const quotaKey: CachedUsageLimitKey =
			input.type === "conversation" ? "conversation_generations_per_cycle" : "resume_creation_generations_per_cycle";

		await assertSingleQuota(context.db, userId, quotaKey);

		context.log?.set({
			generation: {
				type: input.type ?? null,
				model: input.model ?? null,
				has_title: Boolean(input.title),
				has_summary: Boolean(input.summary),
			},
		});

		const insertStart = performance.now();
		const [row] = await context.db
			.insert(generations)
			.values({
				...input,
				owner: userId,
			})
			.returning({ id: generations.id });

		context.log?.set({
			db: { insert_generation_ms: performance.now() - insertStart },
		});

		if (!row) {
			const error = new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create generation" });
			context.log?.set({ outcome: "insert_failed" });
			context.log?.error(error);
			throw error;
		}

		context.log?.set({
			outcome: "created",
			generation: { id: row.id },
		});

		await invalidateViewerUsage(context.db, userId, [quotaKey]);

		return row;
	}),

	get: protectedProcedure.input(getGenerationInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_generation",
			user: { id: userId },
			generation: { id: input.id },
		});

		const [row] = await context.db
			.select()
			.from(generations)
			.where(and(eq(generations.id, input.id), eq(generations.owner, userId)))
			.limit(1);

		context.log?.set({
			outcome: row ? "found" : "not_found",
		});

		return row;
	}),

	list: protectedProcedure.input(listGenerationsInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "list_generations",
			user: { id: userId },
			pagination: { limit: input.limit, offset: input.offset },
		});

		const rows = await context.db
			.select()
			.from(generations)
			.where(eq(generations.owner, userId))
			.limit(input.limit)
			.offset(input.offset);

		if (!rows) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "No pudimos cargar tus generaciones por favor intenta nuevamente en unos minutos",
			});
		}

		return rows;
	}),

	getResumeAnalysis: protectedProcedure.input(getResumeAnalysisInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_resume_analysis",
			user: { id: userId },
			generation: { id: input.generationId },
		});

		const [row] = await context.db
			.select({ id: resumeAnalyses.id, object: resumeAnalyses.object })
			.from(resumeAnalyses)
			.where(
				and(
					eq(resumeAnalyses.generationId, input.generationId),
					eq(resumeAnalyses.userId, userId),
					eq(resumeAnalyses.status, "ready")
				)
			)
			.orderBy(desc(resumeAnalyses.createdAt))
			.limit(1);

		if (!row?.object) {
			context.log?.set({ outcome: "not_found" });
			return null;
		}

		const parsed = resumeAnalysisSchema.safeParse(row.object);
		if (!parsed.success) {
			context.log?.set({ outcome: "invalid", analysis: { id: row.id } });
			return null;
		}

		context.log?.set({ outcome: "found", analysis: { id: row.id } });
		return parsed.data;
	}),

	getResumeAnalysisHistory: protectedProcedure
		.input(getResumeAnalysisHistoryInputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "get_resume_analysis_history",
				user: { id: userId },
				generation: { id: input.generationId },
			});

			const [generation] = await context.db
				.select({ id: generations.id })
				.from(generations)
				.where(and(eq(generations.id, input.generationId), eq(generations.owner, userId)))
				.limit(1)
				.$withCache();

			if (!generation) {
				context.log?.set({ outcome: "generation_not_found" });
				return [];
			}

			const rows = await context.db
				.select({
					id: resumeAnalyses.id,
					generationId: resumeAnalyses.generationId,
					resumeId: resumeAnalyses.resumeId,
					parentAnalysisId: resumeAnalyses.parentAnalysisId,
					status: resumeAnalyses.status,
					model: resumeAnalyses.model,
					object: resumeAnalyses.object,
					error: resumeAnalyses.error,
					createdAt: resumeAnalyses.createdAt,
					updatedAt: resumeAnalyses.updatedAt,
				})
				.from(resumeAnalyses)
				.where(and(eq(resumeAnalyses.generationId, input.generationId), eq(resumeAnalyses.userId, userId)))
				.orderBy(asc(resumeAnalyses.createdAt))
				.$withCache();

			const analysesById = new Map<string, ResumeAnalysis>();

			for (const row of rows) {
				const parsed = resumeAnalysisSchema.safeParse(row.object);
				if (parsed.success) {
					analysesById.set(row.id, parsed.data);
				}
			}

			let previousAnalysis: { id: string; analysis: ResumeAnalysis } | null = null;
			const history: ResumeAnalysisHistoryItem[] = [];

			for (const row of rows) {
				const analysis = analysesById.get(row.id) ?? null;
				const parentAnalysis = row.parentAnalysisId === null ? undefined : analysesById.get(row.parentAnalysisId);
				const baseline =
					parentAnalysis && row.parentAnalysisId
						? { id: row.parentAnalysisId, analysis: parentAnalysis }
						: previousAnalysis;

				history.push({
					...row,
					analysis,
					diff: createResumeAnalysisDiff(analysis, baseline?.analysis ?? null, baseline?.id ?? null),
				});

				if (analysis) {
					previousAnalysis = { id: row.id, analysis };
				}
			}

			context.log?.set({
				outcome: "listed",
				analyses: { count: history.length },
			});

			return history;
		}),
};

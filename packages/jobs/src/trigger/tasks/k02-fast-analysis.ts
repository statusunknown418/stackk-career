import { getTriggerDb } from "@stackk-career/db/http";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import { buildResumeSnapshot } from "@stackk-career/schemas/ai/resume-snapshot";
import { k02FastAnalysisInputSchema } from "@stackk-career/schemas/jobs/k02-fast-analysis";
import { viewerUsageTag } from "@stackk-career/schemas/subscriptions";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { idempotencyKeys, logger, metadata, schemaTask, tasks } from "@trigger.dev/sdk";
import { and, eq, ne } from "drizzle-orm";
import {
	K02_FAST_ANALYSIS_MODEL,
	K02_FAST_ANALYSIS_OBJECT_TYPE,
	runK02FastAnalysisAgent,
} from "../../agents/k02-fast-analysis.handler";
import { validateEditCandidates } from "../../lib/resume-analysis/edit-candidate-validator";
import { normalizeResumeAnalysis } from "../../lib/resume-analysis/normalize-resume-analysis";
import { assertPdfHostAllowed } from "../../lib/utils";
import { k02Queue } from "../queues";
import { resumeAnalysisStream } from "../streams";

const K02_FAST_ANALYSIS_MODEL_SLUG = String(K02_FAST_ANALYSIS_MODEL);
const K02_FAST_ANALYSIS_PROVIDER = K02_FAST_ANALYSIS_MODEL_SLUG.split("/", 1)[0] ?? "unknown";

export const k02FastAnalysisTask = schemaTask({
	id: "k02-fast-analysis",
	queue: k02Queue,
	schema: k02FastAnalysisInputSchema,
	maxDuration: 300,
	retry: {
		maxAttempts: 3,
		factor: 2,
		minTimeoutInMs: 1000,
		maxTimeoutInMs: 30_000,
	},
	run: async ({ analysisId, displayName, fileId, generationId, userId, pdfUrl }, { ctx, signal }) => {
		const db = getTriggerDb();

		logger.info("k02-fast-analysis = start", {
			analysisId,
			generationId,
			userId,
			attempt: ctx.attempt.number,
		});

		const pdfUrlObj = assertPdfHostAllowed(pdfUrl);

		await db
			.update(resumeAnalyses)
			.set({ status: "running" })
			.where(and(eq(resumeAnalyses.id, analysisId), eq(resumeAnalyses.status, "pending")));

		metadata.set("step", "analyzing");

		const result = await runK02FastAnalysisAgent({ pdfUrl: pdfUrlObj.toString(), userId, signal });
		const { waitUntilComplete } = resumeAnalysisStream.pipe(result.partialOutputStream);

		const draft = await result.output;
		const usage = await result.totalUsage;
		const finishReason = await result.finishReason;
		await waitUntilComplete();

		// No block tree exists yet (PDF pre-parse): an empty snapshot downgrades every
		// edit to informational and skips deterministic gates, while the normalizer still
		// clamps sub-scores and recomputes the weighted overall.
		const snapshot = buildResumeSnapshot([]);
		const validated = validateEditCandidates(draft.edits, snapshot);
		const { analysis: object } = normalizeResumeAnalysis({
			scoreBreakdown: draft.scoreBreakdown,
			edits: validated.edits,
			userInputRequests: validated.userInputRequests,
			qualityGates: [],
			snapshot,
		});

		metadata.set("ai", {
			model: K02_FAST_ANALYSIS_MODEL_SLUG,
			provider: K02_FAST_ANALYSIS_PROVIDER,
			feature: "k02-fast-analysis",
			attempt: ctx.attempt.number,
			finishReason: finishReason ?? null,
			usage: {
				inputTokens: usage.inputTokens ?? null,
				cachedInputTokens: usage.cachedInputTokens ?? null,
				outputTokens: usage.outputTokens ?? null,
				reasoningTokens: usage.reasoningTokens ?? null,
				totalTokens: usage.totalTokens ?? null,
			},
		});

		metadata.set("step", "persisting");

		await db.batch([
			db
				.update(resumeAnalyses)
				.set({
					status: "ready",
					model: K02_FAST_ANALYSIS_MODEL,
					object,
					rubricVersion: object.rubricVersion,
					error: null,
				})
				.where(eq(resumeAnalyses.id, analysisId)),
			db.insert(messages).values({
				generationId,
				analysisId,
				isAssistant: true,
				order: 0,
				model: K02_FAST_ANALYSIS_MODEL,
				objectType: K02_FAST_ANALYSIS_OBJECT_TYPE,
			}),
		]);

		let resumeParserRunId: string | null = null;

		if (fileId) {
			metadata.set("step", "queueing_resume_parser");

			try {
				const idempotencyKey = await idempotencyKeys.create(`resume-parser-from-analysis-${analysisId}`);
				const handle = await tasks.trigger<typeof resumeParserTask>(
					"resume-parser",
					{
						userId,
						fileId,
						generationId,
						displayName,
					},
					{
						concurrencyKey: userId,
						idempotencyKey,
						idempotencyKeyTTL: "24h",
						tags: [
							`user:${userId}`,
							`file:${fileId}`,
							`gen:${generationId}`,
							`analysis:${analysisId}`,
							"agent:resume-parser",
							"source:k02-fast-analysis",
						],
					}
				);

				resumeParserRunId = handle.id;
				metadata.set("resumeParserRunId", handle.id);
				metadata.set("resumeParserStatus", "queued");

				logger.info("k02-fast-analysis = resume_parser_triggered", {
					analysisId,
					fileId,
					generationId,
					resumeParserRunId,
					userId,
				});
			} catch (error) {
				const message = toError(error).message;
				metadata.set("resumeParserStatus", "failed");
				metadata.set("resumeParserError", message);

				logger.warn("k02-fast-analysis = resume_parser_trigger_failed", {
					analysisId,
					error: message,
					fileId,
					generationId,
					userId,
				});
			}
		}

		metadata.set("step", "complete");

		return { analysisId, generationId, resumeParserRunId, userId, object };
	},

	onFailure: async ({ payload, error, ctx }) => {
		const db = getTriggerDb();
		const message = toError(error).message;

		logger.error("k02-fast-analysis = failed", {
			analysisId: payload.analysisId,
			generationId: payload.generationId,
			error: message,
			attempt: ctx.attempt.number,
		});

		const updated = await db
			.update(resumeAnalyses)
			.set({ status: "failed", error: message, model: K02_FAST_ANALYSIS_MODEL })
			.where(and(eq(resumeAnalyses.id, payload.analysisId), ne(resumeAnalyses.status, "ready")))
			.returning({ userId: resumeAnalyses.userId });

		if (updated[0]) {
			await db.$cache.invalidate({
				tags: [viewerUsageTag(updated[0].userId, "resume_analyses_per_cycle")],
			});
		}
	},
});

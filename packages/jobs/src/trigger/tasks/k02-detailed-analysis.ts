import { getTriggerDb } from "@stackk-career/db/http";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { k02DetailedAnalysisInputSchema } from "@stackk-career/schemas/jobs/k02-detailed-analysis";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, eq, isNull, ne } from "drizzle-orm";
import {
	K02_DETAILED_ANALYSIS_MODEL,
	K02_DETAILED_ANALYSIS_OBJECT_TYPE,
	runK02DetailedAnalysisAgent,
} from "../../agents/k02-detailed-analysis.handler";
import { k02DetailedQueue } from "../queues";
import { resumeAnalysisStream } from "../streams";

export const k02DetailedAnalysisTask = schemaTask({
	id: "k02-detailed-analysis",
	queue: k02DetailedQueue,
	schema: k02DetailedAnalysisInputSchema,
	maxDuration: 600,
	run: async ({ analysisId, generationId, resumeId, userId }, { ctx, signal }) => {
		const db = getTriggerDb();

		logger.info("k02-detailed-analysis = start", {
			analysisId,
			generationId,
			resumeId,
			userId,
			attempt: ctx.attempt.number,
		});

		const [resume] = await db
			.select({ id: resumes.id, userId: resumes.userId })
			.from(resumes)
			.where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
			.limit(1);

		if (!resume) {
			throw new Error(`Resume ${resumeId} not found for user ${userId}`);
		}

		const blocks = await db
			.select()
			.from(resumeBlocks)
			.where(and(eq(resumeBlocks.resumeId, resumeId), isNull(resumeBlocks.deletedAt)));

		if (blocks.length === 0) {
			throw new Error(`Resume ${resumeId} has no blocks to analyze`);
		}

		const tree = buildBlockTree(blocks);
		const resumeContent = JSON.stringify(tree, null, 2);

		await db
			.update(resumeAnalyses)
			.set({ status: "running", resumeId })
			.where(and(eq(resumeAnalyses.id, analysisId), eq(resumeAnalyses.status, "pending")));

		metadata.set("step", "analyzing");

		const result = await runK02DetailedAnalysisAgent({ resumeContent, userId, signal });

		const { waitUntilComplete } = resumeAnalysisStream.pipe(result.partialOutputStream);

		const [outputResult, usageResult, broadcastResult] = await Promise.allSettled([
			result.output,
			result.usage,
			waitUntilComplete(),
		]);

		if (outputResult.status === "rejected") {
			throw outputResult.reason;
		}
		if (broadcastResult.status === "rejected") {
			logger.warn("k02-detailed-analysis = broadcast_failed", { reason: String(broadcastResult.reason) });
		}

		const object = outputResult.value;
		const usage = usageResult.status === "fulfilled" ? usageResult.value : undefined;

		logger.info("k02-detailed-analysis = completed", { analysisId, generationId, resumeId, usage });

		metadata.set("step", "persisting");

		await db.batch([
			db
				.update(resumeAnalyses)
				.set({ status: "ready", model: K02_DETAILED_ANALYSIS_MODEL, object, error: null, resumeId })
				.where(eq(resumeAnalyses.id, analysisId)),
			db.insert(messages).values({
				generationId,
				analysisId,
				isAssistant: true,
				order: 0,
				model: K02_DETAILED_ANALYSIS_MODEL,
				objectType: K02_DETAILED_ANALYSIS_OBJECT_TYPE,
			}),
		]);

		metadata.set("step", "complete");

		return { analysisId, generationId, resumeId, userId, object };
	},

	onFailure: async ({ payload, error, ctx }) => {
		const db = getTriggerDb();
		const message = toError(error).message;

		logger.error("k02-detailed-analysis = failed", {
			analysisId: payload.analysisId,
			generationId: payload.generationId,
			resumeId: payload.resumeId,
			error: message,
			attempt: ctx.attempt.number,
		});

		await db
			.update(resumeAnalyses)
			.set({ status: "failed", error: message, model: K02_DETAILED_ANALYSIS_MODEL })
			.where(and(eq(resumeAnalyses.id, payload.analysisId), ne(resumeAnalyses.status, "ready")));
	},
});

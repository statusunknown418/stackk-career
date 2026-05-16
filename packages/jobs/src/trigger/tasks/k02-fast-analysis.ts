import { getTriggerDb } from "@stackk-career/db/http";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { k02FastAnalysisInputSchema } from "@stackk-career/schemas/jobs/k02-fast-analysis";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, eq, ne } from "drizzle-orm";
import {
	K02_FAST_ANALYSIS_MODEL,
	K02_FAST_ANALYSIS_OBJECT_TYPE,
	runK02FastAnalysisAgent,
} from "../../agents/k02-fast-analysis";
import { assertPdfHostAllowed } from "../lib/utils";
import { agentQueue } from "../queues";
import { resumeAnalysisStream } from "../streams";

export const k02FastAnalysisTask = schemaTask({
	id: "k02-fast-analysis",
	queue: agentQueue,
	schema: k02FastAnalysisInputSchema,
	maxDuration: 300,
	run: async ({ analysisId, generationId, userId, pdfUrl }, { ctx, signal }) => {
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

		const [outputResult, usageResult, broadcastResult] = await Promise.allSettled([
			result.output,
			result.usage,
			waitUntilComplete(),
		]);

		if (outputResult.status === "rejected") {
			throw outputResult.reason;
		}
		if (broadcastResult.status === "rejected") {
			logger.warn("k02-fast-analysis = broadcast_failed", { reason: String(broadcastResult.reason) });
		}

		const object = outputResult.value;
		const usage = usageResult.status === "fulfilled" ? usageResult.value : undefined;

		logger.info("k02-fast-analysis = completed", { analysisId, generationId, usage });

		metadata.set("step", "persisting");

		await db.batch([
			db
				.update(resumeAnalyses)
				.set({ status: "ready", model: K02_FAST_ANALYSIS_MODEL, object, error: null })
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

		metadata.set("step", "complete");

		return { analysisId, generationId, userId, object };
	},

	onFailure: async ({ payload, error, ctx }) => {
		const db = getTriggerDb();
		const message = error instanceof Error ? error.message : String(error);

		logger.error("k02-fast-analysis = failed", {
			analysisId: payload.analysisId,
			generationId: payload.generationId,
			error: message,
			attempt: ctx.attempt.number,
		});

		await db
			.update(resumeAnalyses)
			.set({ status: "failed", error: message, model: K02_FAST_ANALYSIS_MODEL })
			.where(and(eq(resumeAnalyses.id, payload.analysisId), ne(resumeAnalyses.status, "ready")));
	},
});

import { db } from "@stackk-career/db";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumeAgentInputSchema } from "@stackk-career/schemas/jobs/resume-analysis";
import { idempotencyKeys, logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import {
	RESUME_ANALYSIS_MODEL,
	RESUME_ANALYSIS_OBJECT_TYPE,
	runResumeAnalysisAgent,
} from "../../agents/resume-analysis";
import { buildUsageEventRow } from "../../usage/from-ai-sdk";
import { agentQueue } from "../queues";
import { resumeAnalysisStream } from "../streams";
import { persistUsageEventTask } from "./persist-usage-event";

const ALLOWED_PDF_HOST_SUFFIXES = [".utfs.io", ".ufs.sh", "utfs.io"];

function assertPdfHostAllowed(pdfUrl: string): URL {
	const url = new URL(pdfUrl);
	if (url.protocol !== "https:") {
		throw new Error(`Resume PDF must be https. Got: ${url.protocol}`);
	}
	const host = url.hostname.toLowerCase();
	const allowed = ALLOWED_PDF_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(suffix));
	if (!allowed) {
		throw new Error(`Resume PDF host not allowed: ${host}`);
	}
	return url;
}

export const resumeAgentTask = schemaTask({
	id: "resume-agent-task",
	queue: agentQueue,
	schema: resumeAgentInputSchema,
	run: async ({ generationId, userId }, { ctx, signal }) => {
		logger.info("resume-agent = start", {
			generationId,
			userId,
			attempt: ctx.attempt.number,
		});

		metadata.set("step", "loading_file");

		const [file] = await db
			.select({ id: fileMetadata.id, url: fileMetadata.url })
			.from(fileMetadata)
			.where(and(eq(fileMetadata.generationId, generationId), eq(fileMetadata.userId, userId)))
			.limit(1)
			.$withCache();

		if (!file) {
			throw new Error(`Resume file not found for generation ${generationId}`);
		}

		const pdfUrl = assertPdfHostAllowed(file.url);

		await db
			.insert(resumeAnalyses)
			.values({
				generationId,
				userId,
				status: "running",
				model: RESUME_ANALYSIS_MODEL,
			})
			.onConflictDoUpdate({
				target: resumeAnalyses.generationId,
				set: { status: "running", model: RESUME_ANALYSIS_MODEL, error: null, object: null },
			});

		metadata.set("step", "analyzing");

		const result = runResumeAnalysisAgent({ pdfUrl: pdfUrl.toString(), userId, signal });

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
			logger.warn("resume-agent = broadcast_failed", { reason: String(broadcastResult.reason) });
		}

		const object = outputResult.value;
		const usage = usageResult.status === "fulfilled" ? usageResult.value : undefined;

		logger.info("resume-agent = completed", { generationId, usage });

		const usageRow = buildUsageEventRow({
			usage,
			kind: "object",
			modelId: RESUME_ANALYSIS_MODEL,
			userId,
			metadata: {
				generationId,
				taskRunId: ctx.run.id,
				attempt: ctx.attempt.number,
				objectType: RESUME_ANALYSIS_OBJECT_TYPE,
			},
		});

		metadata.set("step", "persisting");

		await db.transaction(async (tx) => {
			await tx
				.update(resumeAnalyses)
				.set({ status: "ready", object, error: null })
				.where(eq(resumeAnalyses.generationId, generationId));

			const [existing] = await tx
				.select({ id: messages.id })
				.from(messages)
				.where(
					and(
						eq(messages.generationId, generationId),
						eq(messages.isAssistant, true),
						eq(messages.objectType, RESUME_ANALYSIS_OBJECT_TYPE)
					)
				)
				.limit(1);

			if (existing) {
				await tx.update(messages).set({ object, model: RESUME_ANALYSIS_MODEL }).where(eq(messages.id, existing.id));
			} else {
				await tx.insert(messages).values({
					generationId,
					isAssistant: true,
					order: 0,
					model: RESUME_ANALYSIS_MODEL,
					object,
					objectType: RESUME_ANALYSIS_OBJECT_TYPE,
				});
			}
		});

		if (usageRow) {
			const idempotencyKey = await idempotencyKeys.create(`usage-${ctx.run.id}`);
			await persistUsageEventTask.trigger(usageRow, {
				idempotencyKey,
				idempotencyKeyTTL: "24h",
			});
		} else {
			logger.warn("resume-agent = usage_unavailable", { generationId });
		}

		metadata.set("step", "complete");

		return { generationId, userId, object };
	},
	onFailure: async ({ payload, error, ctx }) => {
		const message = error instanceof Error ? error.message : String(error);

		logger.error("resume-agent = failed", {
			generationId: payload.generationId,
			error: message,
			attempt: ctx.attempt.number,
		});

		await db
			.insert(resumeAnalyses)
			.values({
				generationId: payload.generationId,
				userId: payload.userId,
				status: "failed",
				model: RESUME_ANALYSIS_MODEL,
				error: message,
			})
			.onConflictDoUpdate({
				target: resumeAnalyses.generationId,
				set: { status: "failed", error: message },
			});
	},
});

import { getTriggerDb, type TriggerDb } from "@stackk-career/db/http";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import {
	type EditCategory,
	type PriorAnalysisContext,
	type PriorEditStatus,
	type ResumeAnalysis,
	resumeAnalysisSchema,
} from "@stackk-career/schemas/ai/resume-analysis";
import { buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { k02DetailedAnalysisInputSchema } from "@stackk-career/schemas/jobs/k02-detailed-analysis";
import { viewerUsageTag } from "@stackk-career/schemas/subscriptions";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, eq, isNull, ne } from "drizzle-orm";
import {
	K02_DETAILED_ANALYSIS_MODEL,
	K02_DETAILED_ANALYSIS_OBJECT_TYPE,
	runK02DetailedAnalysisAgent,
} from "../../agents/k02-detailed-analysis.handler";
import { buildJobTargetContextText, getResumeJobTarget } from "../../lib/resume-job-target";
import { k02DetailedQueue } from "../queues";
import { resumeAnalysisStream } from "../streams";

const K02_DETAILED_ANALYSIS_MODEL_SLUG = String(K02_DETAILED_ANALYSIS_MODEL);
const K02_DETAILED_ANALYSIS_PROVIDER = K02_DETAILED_ANALYSIS_MODEL_SLUG.split("/", 1)[0] ?? "unknown";

export const k02DetailedAnalysisTask = schemaTask({
	id: "k02-detailed-analysis",
	queue: k02DetailedQueue,
	schema: k02DetailedAnalysisInputSchema,
	maxDuration: 600,
	run: async ({ analysisId, generationId, resumeId, userId, parentAnalysisId }, { ctx, signal }) => {
		const db = getTriggerDb();

		logger.info("k02-detailed-analysis = start", {
			analysisId,
			generationId,
			resumeId,
			userId,
			parentAnalysisId: parentAnalysisId ?? null,
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
			.where(and(eq(resumeBlocks.resumeId, resumeId), isNull(resumeBlocks.deletedAt)))
			.$withCache();

		if (blocks.length === 0) {
			throw new Error(`Resume ${resumeId} has no blocks to analyze`);
		}

		const tree = buildBlockTree(blocks);
		const resumeContent = JSON.stringify(tree, null, 2);

		const priorAnalysis = parentAnalysisId ? await loadPriorAnalysisContext(db, parentAnalysisId, userId) : undefined;

		const jobTarget = await getResumeJobTarget(resumeId, userId);
		const jobTargetText = buildJobTargetContextText(jobTarget);
		if (jobTarget) {
			metadata.set("jobTarget", { title: jobTarget.title, company: jobTarget.company });
		}

		if (parentAnalysisId && !priorAnalysis) {
			logger.warn("k02-detailed-analysis = parent_unavailable", {
				analysisId,
				parentAnalysisId,
			});
		}

		await db
			.update(resumeAnalyses)
			.set({ status: "running", resumeId })
			.where(and(eq(resumeAnalyses.id, analysisId), eq(resumeAnalyses.status, "pending")));

		metadata.set("step", "analyzing");

		if (priorAnalysis) {
			metadata.set("reanalysis", {
				parentAnalysisId: priorAnalysis.analysisId,
				priorEdits: priorAnalysis.edits.length,
			});
		}

		const result = await runK02DetailedAnalysisAgent({ resumeContent, userId, signal, priorAnalysis, jobTargetText });
		const { waitUntilComplete } = resumeAnalysisStream.pipe(result.partialOutputStream);

		const rawObject = await result.output;
		const usage = await result.totalUsage;
		const finishReason = await result.finishReason;
		await waitUntilComplete();

		const object = clampEditDeltas(rawObject, (dropped) => {
			logger.warn("k02-detailed-analysis = edits_clamped", {
				analysisId,
				droppedCount: dropped.length,
				droppedDeltas: dropped.map((edit) => ({ category: edit.category, delta: edit.delta })),
			});
		});

		metadata.set("ai", {
			model: K02_DETAILED_ANALYSIS_MODEL_SLUG,
			provider: K02_DETAILED_ANALYSIS_PROVIDER,
			feature: "k02-detailed-analysis",
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

		const updated = await db
			.update(resumeAnalyses)
			.set({ status: "failed", error: message, model: K02_DETAILED_ANALYSIS_MODEL })
			.where(and(eq(resumeAnalyses.id, payload.analysisId), ne(resumeAnalyses.status, "ready")))
			.returning({ userId: resumeAnalyses.userId });

		if (updated[0]) {
			await db.$cache.invalidate({
				tags: [viewerUsageTag(updated[0].userId, "resume_analyses_per_cycle")],
			});
		}
	},
});

function clampEditDeltas(analysis: ResumeAnalysis, onDrop: (dropped: ResumeAnalysis["edits"]) => void): ResumeAnalysis {
	const perCategory: Record<EditCategory, number> = {
		impact: 0,
		keywords: 0,
		clarity: 0,
		formatting: 0,
		length: 0,
	};
	const dropped: ResumeAnalysis["edits"] = [];

	const keptEdits = analysis.edits.filter((edit) => {
		const projected = analysis.scoreBreakdown[edit.category] + perCategory[edit.category] + edit.delta;
		if (projected > 100) {
			dropped.push(edit);
			return false;
		}
		perCategory[edit.category] += edit.delta;
		return true;
	});

	if (dropped.length === 0) {
		return analysis;
	}

	onDrop(dropped);
	return { ...analysis, edits: keptEdits };
}

async function loadPriorAnalysisContext(
	db: TriggerDb,
	parentAnalysisId: string,
	userId: string
): Promise<PriorAnalysisContext | undefined> {
	const [parent] = await db
		.select({
			id: resumeAnalyses.id,
			status: resumeAnalyses.status,
			object: resumeAnalyses.object,
			appliedEditIndices: resumeAnalyses.appliedEditIndices,
			dismissedEditIndices: resumeAnalyses.dismissedEditIndices,
		})
		.from(resumeAnalyses)
		.where(and(eq(resumeAnalyses.id, parentAnalysisId), eq(resumeAnalyses.userId, userId)))
		.$withCache()
		.limit(1);

	if (!parent || parent.status !== "ready" || !parent.object) {
		return;
	}

	const parsed = resumeAnalysisSchema.safeParse(parent.object);
	if (!parsed.success) {
		logger.warn("k02-detailed-analysis = parent_object_invalid", {
			parentAnalysisId,
			issues: parsed.error.issues.slice(0, 3),
		});
		return;
	}

	const analysis: ResumeAnalysis = parsed.data;
	const applied = new Set(parent.appliedEditIndices);
	const dismissed = new Set(parent.dismissedEditIndices);

	const edits = analysis.edits.map((edit, index) => {
		let status: PriorEditStatus;

		if (applied.has(index)) {
			status = "applied";
		} else if (dismissed.has(index)) {
			status = "dismissed";
		} else {
			status = "pending";
		}

		return { ...edit, status };
	});

	return {
		analysisId: parent.id,
		scoreOverall: analysis.scoreOverall,
		scoreBreakdown: analysis.scoreBreakdown,
		edits,
	};
}

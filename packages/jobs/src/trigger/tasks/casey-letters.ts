import { getTriggerDb } from "@stackk-career/db/http";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import { caseyLettersInputSchema } from "@stackk-career/schemas/jobs/casey-letters";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, asc, eq, isNull } from "drizzle-orm";
import { CASEY_LETTERS_MODEL, runCaseyLettersAgent } from "../../agents/casey-letters.handler";
import { letterQueue } from "../queues";

const CASEY_LETTERS_MODEL_SLUG = String(CASEY_LETTERS_MODEL);
const CASEY_LETTERS_PROVIDER = CASEY_LETTERS_MODEL_SLUG.split("/", 1)[0] ?? "unknown";

export const caseyLettersTask = schemaTask({
	id: "casey-letters",
	maxDuration: 300,
	queue: letterQueue,
	retry: {
		factor: 2,
		maxAttempts: 3,
		maxTimeoutInMs: 30_000,
		minTimeoutInMs: 1000,
	},
	schema: caseyLettersInputSchema,
	run: async ({ extraPrompt, generationId, jobPosition, messageId, resumeId, userId }, { ctx, signal }) => {
		const db = getTriggerDb();

		logger.info("casey-letters = start", {
			attempt: ctx.attempt.number,
			generationId,
			messageId,
			userId,
		});

		metadata.set("step", "loading_resume");
		const resumePlaintext = await loadResumeAsPlaintext(db, resumeId, userId);

		metadata.set("step", "generating");
		const result = await runCaseyLettersAgent({
			extraPrompt,
			jobPosition,
			resumePlaintext,
			signal,
			userId,
		});

		// Drain the stream so all tool calls (getUserMetadata, getSelectedResume,
		// generateArtifact) are executed before we inspect the results.
		await result.consumeStream();

		const toolCalls = await result.toolCalls;
		const generateCall = toolCalls.find((c) => c.toolName === "generateArtifact");
		if (!generateCall) {
			throw new Error("CASEY did not emit the generateArtifact tool call");
		}
		const object = coverLetterSchema.parse(generateCall.input);

		const usage = await result.totalUsage;
		const finishReason = await result.finishReason;

		metadata.set("ai", {
			attempt: ctx.attempt.number,
			feature: "casey-letters",
			finishReason: finishReason ?? null,
			model: CASEY_LETTERS_MODEL_SLUG,
			provider: CASEY_LETTERS_PROVIDER,
			toolCalls: toolCalls.map((c) => c.toolName),
			usage: {
				cachedInputTokens: usage.cachedInputTokens ?? null,
				inputTokens: usage.inputTokens ?? null,
				outputTokens: usage.outputTokens ?? null,
				reasoningTokens: usage.reasoningTokens ?? null,
				totalTokens: usage.totalTokens ?? null,
			},
		});

		metadata.set("step", "persisting");
		await db
			.update(messages)
			.set({
				model: CASEY_LETTERS_MODEL,
				object,
				text: object.body,
			})
			.where(and(eq(messages.id, messageId), eq(messages.generationId, generationId)));

		metadata.set("step", "complete");
		return { generationId, messageId, object, toolCalls: toolCalls.map((c) => c.toolName), userId };
	},

	onFailure: async ({ payload, error, ctx }) => {
		const db = getTriggerDb();
		const message = toError(error).message;

		logger.error("casey-letters = failed", {
			attempt: ctx.attempt.number,
			error: message,
			generationId: payload.generationId,
			messageId: payload.messageId,
		});

		await db.update(messages).set({ error: message }).where(eq(messages.id, payload.messageId));
	},
});

/**
 * Serialize the candidate's resume to a structured plain-text representation
 * the model can ground its claims in.
 *
 * Walks the `resume_blocks` tree (root blocks ordered by lexicographic position,
 * then recursively their children) and emits a labelled flat-text block per node.
 * Field names are accessed defensively because the `content` JSON shape varies
 * by `blockType`; this keeps the helper resilient to schema additions without
 * needing per-type narrowing here. The output is good enough for an LLM to
 * cite specific roles, metrics, and skills back into the cover letter.
 *
 * Ownership is enforced inside the query (resumeId must belong to userId).
 */
async function loadResumeAsPlaintext(
	db: ReturnType<typeof getTriggerDb>,
	resumeId: string,
	userId: string
): Promise<string> {
	const [resume] = await db
		.select({ id: resumes.id })
		.from(resumes)
		.where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
		.limit(1);

	if (!resume) {
		throw new Error(`Resume ${resumeId} not found or not owned by user ${userId}`);
	}

	const rows = await db
		.select()
		.from(resumeBlocks)
		.where(and(eq(resumeBlocks.resumeId, resumeId), isNull(resumeBlocks.deletedAt)))
		.orderBy(asc(resumeBlocks.position));

	type Row = (typeof rows)[number];
	const childrenByParent = new Map<number | "root", Row[]>();
	for (const row of rows) {
		const key: number | "root" = row.parentBlockId ?? "root";
		const list = childrenByParent.get(key) ?? [];
		list.push(row);
		childrenByParent.set(key, list);
	}

	const TEXT_FIELDS = [
		"firstName",
		"lastName",
		"title",
		"subtitle",
		"company",
		"organization",
		"institution",
		"descriptor",
		"text",
		"label",
		"name",
		"value",
		"email",
		"phone",
		"location",
		"linkedin",
		"github",
		"url",
		"website",
		"level",
		"proficiency",
	] as const;

	const renderContent = (content: unknown): string => {
		if (!content || typeof content !== "object") {
			return "";
		}
		const c = content as Record<string, unknown>;
		const parts = TEXT_FIELDS.map((f) => c[f]).filter((v): v is string => typeof v === "string" && v.length > 0);
		const startDate = typeof c.startDate === "string" ? c.startDate : null;
		const endDate = typeof c.endDate === "string" ? c.endDate : null;
		const dateRange = startDate ? ` (${startDate}${endDate ? ` – ${endDate}` : " – presente"})` : "";
		return `${parts.join(" · ")}${dateRange}`.trim();
	};

	const lines: string[] = [];

	const INDENT_BY_DEPTH = ["", "  - ", "    • "] as const;

	const walk = (row: Row, depth: number): void => {
		const text = renderContent(row.content);
		const prefix = INDENT_BY_DEPTH[Math.min(depth, INDENT_BY_DEPTH.length - 1)];
		if (text) {
			lines.push(`${prefix}[${row.blockType}] ${text}`);
		}
		const kids = childrenByParent.get(row.id) ?? [];
		for (const kid of kids) {
			walk(kid, depth + 1);
		}
	};

	for (const root of childrenByParent.get("root") ?? []) {
		walk(root, 0);
		lines.push("");
	}

	return lines.join("\n").trim();
}

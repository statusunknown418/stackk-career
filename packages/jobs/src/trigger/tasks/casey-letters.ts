import { getTriggerDb } from "@stackk-career/db/http";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { COVER_LETTER_OBJECT_TYPE, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import { caseyLettersInputSchema } from "@stackk-career/schemas/jobs/casey-letters";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, asc, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";
import {
	CASEY_LETTERS_FALLBACK_MODEL,
	CASEY_LETTERS_MODEL,
	runCaseyLettersAgent,
} from "../../agents/casey-letters.handler";
import { envNumber } from "../../lib/env-number";
import { letterQueue } from "../queues";
import { coverLetterArtifactStream } from "../streams";

/**
 * Soft cap on the resume plaintext we inject as tool output. ~8k chars ≈ 2k tokens —
 * comfortably covers a typical 2-3 page LATAM CV. On overflow we truncate at the last
 * newline before the cap and leave an explicit marker so the model knows data is
 * missing instead of inventing it.
 */
const MAX_RESUME_PLAINTEXT_CHARS = 8000;

/**
 * Attempt at which we switch to `CASEY_LETTERS_FALLBACK_MODEL`. Today primary and fallback
 * point to the SAME slug (no-op); this is just a hook to degrade to another variant on the
 * last attempt later without touching the task.
 */
const FALLBACK_ON_ATTEMPT = envNumber(process.env.CASEY_LETTERS_FALLBACK_ON_ATTEMPT, 3);

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
	run: async (
		{ extraPrompt, generationId, jobPosition, jobDescription, language, messageId, resumeId, userId },
		{ ctx, signal }
	) => {
		const db = getTriggerDb();

		// Gemini primary; fallback (same slug today) on the last attempt if earlier ones failed.
		const modelForAttempt =
			ctx.attempt.number >= FALLBACK_ON_ATTEMPT ? CASEY_LETTERS_FALLBACK_MODEL : CASEY_LETTERS_MODEL;
		const modelSlug = String(modelForAttempt);
		const modelProvider = modelSlug.split("/", 1)[0] ?? "unknown";

		logger.info("casey-letters = start", {
			attempt: ctx.attempt.number,
			generationId,
			language,
			messageId,
			model: modelSlug,
			userId,
		});

		metadata.set("language", language);
		metadata.set("step", "loading_resume");
		const resumePlaintext = await loadResumeAsPlaintext(db, resumeId, userId);

		// User instructions (tone presets or free text) are REVISIONS of the current letter:
		// without passing it, the model regenerates from scratch and manual edits are lost.
		// A re-run without extraPrompt is an intentional from-scratch regeneration.
		const previousLetter = extraPrompt ? await loadPreviousLetterPlaintext(db, generationId, messageId) : undefined;

		metadata.set("step", "generating");
		const result = await runCaseyLettersAgent({
			extraPrompt,
			jobPosition,
			jobDescription,
			language,
			model: modelForAttempt,
			previousLetter,
			resumePlaintext,
			signal,
			userId,
		});

		// Stream partial CoverLetter chunks to the UI as the model emits structured output
		// (mirrors the k02-fast-analysis pattern). The pipe drains the stream — tools run and
		// the schema-enforced `output` is complete before we read it.
		const { waitUntilComplete } = coverLetterArtifactStream.pipe(result.partialOutputStream);

		const object = await result.output;
		const toolCalls = await result.toolCalls;
		const usage = await result.totalUsage;
		const finishReason = await result.finishReason;
		await waitUntilComplete();

		metadata.set("ai", {
			attempt: ctx.attempt.number,
			feature: "casey-letters",
			finishReason: finishReason ?? null,
			model: modelSlug,
			provider: modelProvider,
			toolCalls: toolCalls.map((c) => c.toolName),
			usage: {
				cachedInputTokens: usage.cachedInputTokens ?? null,
				inputTokens: usage.inputTokens ?? null,
				outputTokens: usage.outputTokens ?? null,
				reasoningTokens: usage.reasoningTokens ?? null,
				totalTokens: usage.totalTokens ?? null,
			},
		});

		// Persist each tool call as a chat row so the left panel renders them inline. The API
		// reserves `artifactOrder - 1` for tools: the get query orders by (order asc, createdAt
		// asc), so inserting them one step before the artifact renders them BEFORE its version
		// card, not after.
		if (toolCalls.length > 0) {
			metadata.set("step", "persisting_tool_calls");
			const [artifactRow] = await db
				.select({ order: messages.order })
				.from(messages)
				.where(eq(messages.id, messageId))
				.limit(1);
			if (!artifactRow) {
				// The router inserts the pending row BEFORE triggering the task; if it's missing,
				// the state is invalid and a silent default would hide the problem.
				throw new Error(`Artifact message ${messageId} not found for generation ${generationId}`);
			}
			const toolOrder = (artifactRow.order ?? 1) - 1;

			// Idempotent across retries: run() restarts from scratch on each attempt, so without
			// this an attempt that inserted tools and then failed would duplicate the chips.
			// THIS turn's tool rows are identified by their artifact link (parentMessageId), NOT
			// by `order`: with two concurrent triggers the max+1 scheme can collide, and deleting
			// by order would wipe the other turn's chips.
			await db
				.delete(messages)
				.where(
					and(
						eq(messages.generationId, generationId),
						eq(messages.isTool, true),
						eq(messages.parentMessageId, messageId)
					)
				);

			await db.insert(messages).values(
				toolCalls.map((call) => ({
					generationId,
					isAssistant: true,
					isTool: true,
					order: toolOrder,
					parentMessageId: messageId,
					toolMeta: { toolId: call.toolCallId, toolName: call.toolName },
				}))
			);
		}

		metadata.set("step", "persisting");
		await db
			.update(messages)
			.set({
				// error: null — the row may carry a stale mark (e.g. "trigger_failed", or a prior
				// attempt's error). Success ALWAYS clears it: object and error are exclusive.
				error: null,
				model: modelForAttempt,
				object,
				text: object.body,
			})
			.where(and(eq(messages.id, messageId), eq(messages.generationId, generationId)));

		metadata.set("step", "complete");
		return { generationId, messageId, model: modelSlug, object, toolCalls: toolCalls.map((c) => c.toolName), userId };
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
 * Latest valid letter version (complete object, no error), excluding THIS run's pending
 * row. Sections are plain text end to end (CASEY emits plain text, the editor saves plain
 * text), so they go straight into the prompt. Since `updateArtifact` overwrites the same
 * row, this includes manual user edits. Undefined = no version yet, write from scratch.
 */
async function loadPreviousLetterPlaintext(
	db: ReturnType<typeof getTriggerDb>,
	generationId: string,
	pendingMessageId: string
): Promise<string | undefined> {
	const [prev] = await db
		.select({ object: messages.object })
		.from(messages)
		.where(
			and(
				eq(messages.generationId, generationId),
				eq(messages.objectType, COVER_LETTER_OBJECT_TYPE),
				isNull(messages.error),
				isNotNull(messages.object),
				ne(messages.id, pendingMessageId)
			)
		)
		.orderBy(desc(messages.order), desc(messages.createdAt))
		.limit(1);

	const parsed = coverLetterSchema.safeParse(prev?.object);
	if (!parsed.success) {
		return;
	}
	const { greeting, body, closing, signature } = parsed.data;
	return [greeting, body, closing, signature].join("\n\n");
}

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
		.select({
			id: resumeBlocks.id,
			parentBlockId: resumeBlocks.parentBlockId,
			blockType: resumeBlocks.blockType,
			content: resumeBlocks.content,
		})
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

	const full = lines.join("\n").trim();
	if (full.length <= MAX_RESUME_PLAINTEXT_CHARS) {
		return full;
	}

	// Truncating at the last newline before the cap keeps blocks whole, and the explicit
	// marker keeps the model from inventing what's missing.
	const head = full.slice(0, MAX_RESUME_PLAINTEXT_CHARS);
	const lastNewline = head.lastIndexOf("\n");
	const safeCut = lastNewline > 0 ? head.slice(0, lastNewline) : head;
	const omittedChars = full.length - safeCut.length;

	return `${safeCut}\n\n[…CV truncado — ${omittedChars} caracteres omitidos para acotar el contexto. Si falta un dato puntual que no aparece arriba, omítelo en la carta en vez de inventarlo…]`;
}

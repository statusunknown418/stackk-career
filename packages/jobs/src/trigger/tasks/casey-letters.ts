import { getTriggerDb } from "@stackk-career/db/http";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { validateCoverLetter } from "@stackk-career/schemas/ai/cover-letter-validator";
import { caseyLettersInputSchema } from "@stackk-career/schemas/jobs/casey-letters";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
	CASEY_LETTERS_FALLBACK_MODEL,
	CASEY_LETTERS_MODEL,
	runCaseyLettersAgent,
} from "../../agents/casey-letters.handler";
import { letterQueue } from "../queues";
import { coverLetterArtifactStream } from "../streams";

/**
 * Soft cap on the resume plaintext we inject as tool output. ~8k chars ≈ 2k tokens —
 * cubre con margen un CV típico de LATAM de 2-3 páginas. Si excede, truncamos al
 * último newline antes del cap y dejamos una marca explícita para que el modelo
 * entienda que faltan datos en vez de inventarlos.
 */
const MAX_RESUME_PLAINTEXT_CHARS = 8000;

/**
 * Switch to Haiku 4.5 on the last retry attempt. The first two attempts use
 * Sonnet (mejor calidad para redacción). Si Sonnet falla 2x — probablemente
 * timeout, rate limit transiente o un edge case del modelo — el tercer intento
 * cambia a Haiku como fallback antes de surfaecer el error al usuario.
 */
const FALLBACK_ON_ATTEMPT = Number(process.env.CASEY_LETTERS_FALLBACK_ON_ATTEMPT ?? 3);

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

		// Sonnet en attempts 1-2; Haiku como fallback en el último intento si los anteriores fallaron.
		const modelForAttempt =
			ctx.attempt.number >= FALLBACK_ON_ATTEMPT ? CASEY_LETTERS_FALLBACK_MODEL : CASEY_LETTERS_MODEL;
		const modelSlug = String(modelForAttempt);
		const modelProvider = modelSlug.split("/", 1)[0] ?? "unknown";

		logger.info("casey-letters = start", {
			attempt: ctx.attempt.number,
			generationId,
			messageId,
			model: modelSlug,
			userId,
		});

		metadata.set("step", "loading_resume");
		const resumePlaintext = await loadResumeAsPlaintext(db, resumeId, userId);

		metadata.set("step", "generating");
		const result = await runCaseyLettersAgent({
			extraPrompt,
			jobPosition,
			model: modelForAttempt,
			resumePlaintext,
			signal,
			userId,
		});

		// Stream partial CoverLetter chunks to the UI as the model emits structured output
		// (calca el patrón de k02-fast-analysis). El pipe drena el stream — los tools se
		// ejecutan y el `output` schema-enforced queda completo antes de leerlo.
		const { waitUntilComplete } = coverLetterArtifactStream.pipe(result.partialOutputStream);

		const object = await result.output;
		const toolCalls = await result.toolCalls;
		const usage = await result.totalUsage;
		const finishReason = await result.finishReason;
		await waitUntilComplete();

		// Anti-clichés check. Solo informativo — loggeamos + flageamos en metadata.
		// La decisión de reintentar con feedback queda para una iteración futura;
		// hoy queremos visibilidad de la frecuencia con que el modelo igual emite
		// frases baneadas a pesar del system prompt.
		const validation = validateCoverLetter(object);
		if (!validation.ok) {
			logger.warn("casey-letters = banned_phrases_detected", {
				attempt: ctx.attempt.number,
				foundPhrases: validation.foundPhrases,
				generationId,
				messageId,
			});
		}

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
			validation: {
				foundPhrases: [...validation.foundPhrases],
				ok: validation.ok,
			},
		});

		// Persist each tool call as a chat row so el panel izquierdo los renderiza inline
		// (fidelidad al diagrama: getUserMetadata → message, getSelectedResume → message).
		// Compartimos el `order` del artifact: la query del get ordena por
		// (order asc, createdAt asc), así que los tools quedan entre el turno del usuario
		// y el siguiente mensaje sin colisionar con el artifact (que el chat filtra).
		if (toolCalls.length > 0) {
			metadata.set("step", "persisting_tool_calls");
			const [artifactRow] = await db
				.select({ order: messages.order })
				.from(messages)
				.where(eq(messages.id, messageId))
				.limit(1);
			const artifactOrder = artifactRow?.order ?? 0;

			await db.insert(messages).values(
				toolCalls.map((call) => ({
					generationId,
					isAssistant: true,
					isTool: true,
					order: artifactOrder,
					toolMeta: { toolId: call.toolCallId, toolName: call.toolName },
				}))
			);
		}

		metadata.set("step", "persisting");
		await db
			.update(messages)
			.set({
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

	const full = lines.join("\n").trim();
	if (full.length <= MAX_RESUME_PLAINTEXT_CHARS) {
		return full;
	}

	// Truncar al último newline antes del cap mantiene blocks completos (no partimos
	// un block a la mitad) y la marca explícita evita que el modelo invente lo que
	// le falta.
	const head = full.slice(0, MAX_RESUME_PLAINTEXT_CHARS);
	const lastNewline = head.lastIndexOf("\n");
	const safeCut = lastNewline > 0 ? head.slice(0, lastNewline) : head;
	const omittedChars = full.length - safeCut.length;

	return `${safeCut}\n\n[…CV truncado — ${omittedChars} caracteres omitidos para acotar el contexto. Si necesitás un dato puntual que no aparece arriba, omitilo en la carta en vez de improvisarlo…]`;
}

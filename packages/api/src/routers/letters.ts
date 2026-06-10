import { ORPCError } from "@orpc/client";
import { generations } from "@stackk-career/db/schema/generations";
import { messages } from "@stackk-career/db/schema/messages";
import { resumes } from "@stackk-career/db/schema/resumes";
import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import { COVER_LETTER_OBJECT_TYPE, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import {
	createCoverLetterGenerationInputSchema,
	triggerCoverLetterInputSchema,
} from "@stackk-career/schemas/api/letters";
import { getEffectiveEntitlements, isUnlimited, type LimitValue } from "@stackk-career/schemas/subscriptions";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "..";
import { invalidateViewerLetters, viewerLettersTag } from "../lib/viewer-cache";
import { getActiveSubscriptionForUser } from "../services/subscriptions";

const PREVIEW_MAX_CHARS = 180;
const WHITESPACE_RE = /\s+/g;

/** Primeras ~180 chars del body en una sola línea, para la card del listado. */
function toPreview(text: string): string {
	const clean = text.replace(WHITESPACE_RE, " ").trim();
	return clean.length > PREVIEW_MAX_CHARS ? `${clean.slice(0, PREVIEW_MAX_CHARS).trimEnd()}…` : clean;
}

/** El límite `cover_letter_versions` del plan como número (ningún plan lo deja "unlimited" hoy). */
function resolveMaxVersions(limit: LimitValue): number {
	return isUnlimited(limit) ? Number.MAX_SAFE_INTEGER : limit;
}

export const lettersRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		context.log?.set({ action: "list_cover_letters", user: { id: userId } });

		const rows = await context.db
			.select({
				id: generations.id,
				title: generations.title,
				resumeId: generations.resumeId,
				// CV base de la carta — sirve de diferenciador en el listado (varias cartas
				// pueden compartir puesto pero usar CVs distintos). leftJoin: el CV puede no existir.
				resumeTitle: resumes.title,
				language: generations.language,
				createdAt: generations.createdAt,
				updatedAt: generations.updatedAt,
			})
			.from(generations)
			.leftJoin(resumes, eq(resumes.id, generations.resumeId))
			.where(and(eq(generations.owner, userId), eq(generations.type, "cover-letter")))
			.orderBy(desc(generations.updatedAt))
			.$withCache({ tag: viewerLettersTag(userId) });

		if (rows.length === 0) {
			return rows.map((row) => ({ ...row, preview: null as string | null }));
		}

		// Preview = body de la última versión de cada carta (messages.text = body del artifact).
		// Una sola query con `inArray` evita N+1; en JS nos quedamos con el de mayor `order` por carta.
		const generationIds = rows.map((row) => row.id);
		const artifacts = await context.db
			.select({ generationId: messages.generationId, text: messages.text, order: messages.order })
			.from(messages)
			.where(
				and(
					inArray(messages.generationId, generationIds),
					eq(messages.objectType, COVER_LETTER_OBJECT_TYPE),
					eq(messages.isAssistant, true),
					isNotNull(messages.text),
					isNull(messages.error)
				)
			)
			.orderBy(asc(messages.generationId), desc(messages.order));

		const previewByGeneration = new Map<string, string>();
		for (const { generationId, text } of artifacts) {
			if (text && !previewByGeneration.has(generationId)) {
				previewByGeneration.set(generationId, toPreview(text));
			}
		}

		return rows.map((row) => ({ ...row, preview: previewByGeneration.get(row.id) ?? null }));
	}),

	createGeneration: protectedProcedure
		.input(createCoverLetterGenerationInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;
			context.log?.set({
				action: "create_cover_letter_generation",
				user: { id: userId },
				resume: { id: input.resumeId },
			});

			// Validate the user owns the selected CV. (resumeId is a plain text column on generations
			// to avoid a circular import with the resumes schema; ownership is enforced here.)
			const [resume] = await context.db
				.select({ id: resumes.id })
				.from(resumes)
				.where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)))
				.limit(1);

			if (!resume) {
				context.log?.set({ outcome: "resume_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "CV no encontrado" });
			}

			const [created] = await context.db
				.insert(generations)
				.values({
					owner: userId,
					type: "cover-letter",
					title: input.jobPosition,
					summary: input.jobDescription,
					resumeId: input.resumeId,
					language: input.language,
				})
				.returning({ id: generations.id });

			if (!created) {
				context.log?.set({ outcome: "insert_failed" });
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No pudimos crear la carta" });
			}

			await invalidateViewerLetters(context.db, userId);
			context.log?.set({ outcome: "created", generation: { id: created.id } });
			return { generationId: created.id };
		}),

	get: protectedProcedure
		.input(z.object({ generationId: z.string().nonempty() }))
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;
			context.log?.set({
				action: "get_cover_letter",
				user: { id: userId },
				generation: { id: input.generationId },
			});

			// Una sola query: la generación + (leftJoin) su CV vinculado. Antes el CV era una 2ª
			// query (round-trip extra); el FE usa resume.title/displayName en /letters/:id.
			const [row] = await context.db
				.select({
					id: generations.id,
					title: generations.title,
					summary: generations.summary,
					resumeId: generations.resumeId,
					language: generations.language,
					createdAt: generations.createdAt,
					updatedAt: generations.updatedAt,
					resumeTitle: resumes.title,
					resumeDisplayName: resumes.displayName,
					linkedResumeId: resumes.id,
				})
				.from(generations)
				.leftJoin(resumes, and(eq(resumes.id, generations.resumeId), eq(resumes.userId, userId)))
				.where(
					and(
						eq(generations.id, input.generationId),
						eq(generations.owner, userId),
						eq(generations.type, "cover-letter")
					)
				)
				.limit(1)
				.$withCache({ tag: viewerLettersTag(userId) });

			if (!row) {
				context.log?.set({ outcome: "not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Carta no encontrada" });
			}

			const { resumeTitle, resumeDisplayName, linkedResumeId, ...generation } = row;
			const linkedResume = linkedResumeId
				? { id: linkedResumeId, title: resumeTitle, displayName: resumeDisplayName }
				: null;

			const messageRows = await context.db
				.select()
				.from(messages)
				.where(eq(messages.generationId, generation.id))
				// `rowid` (orden de inserción) como tiebreak final: order + createdAt (segundos)
				// pueden empatar — los 2 tool-rows comparten order, y dos triggers concurrentes
				// pueden colisionar en order. El rowid garantiza un render estable y determinista
				// (tools en orden de llamada; versiones en orden de creación) pase lo que pase.
				.orderBy(asc(messages.order), asc(messages.createdAt), sql`rowid`);

			// Latest assistant message tagged as a cover-letter artifact = current letter.
			// `error === null`: mismo criterio que el FE para "versión válida" — una fila con
			// object Y error a la vez (run reintentado a medias) no debe mostrarse como carta.
			const latestArtifactMessage = [...messageRows]
				.reverse()
				.find(
					(m) =>
						m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE && m.object !== null && m.error === null
				);

			const latestArtifact = latestArtifactMessage?.object
				? (coverLetterSchema.safeParse(latestArtifactMessage.object).data ?? null)
				: null;

			const subscription = await getActiveSubscriptionForUser(context.db, userId);
			const maxVersions = resolveMaxVersions(getEffectiveEntitlements(subscription).cover_letter_versions);

			return {
				generation,
				resume: linkedResume,
				messages: messageRows,
				latestArtifact,
				maxVersions,
			};
		}),

	/**
	 * Dispatch a CASEY-Letters Trigger.dev run. The task picks up the candidate's CV
	 * via `resumeId` and the target role via the generation's `title`. The pending
	 * artifact message is inserted BEFORE the trigger so the UI can render its row
	 * immediately; the task fills `object` + `text` on completion, or `onFailure`
	 * stamps an `error` on the same row.
	 *
	 * Pattern calca `agents.triggerK02FastAnalysis`: concurrencyKey scoped to the
	 * generation (so re-triggers on the same letter serialize), idempotencyKey to
	 * dedupe retries, tags for realtime token scoping on the frontend.
	 */
	trigger: protectedProcedure.input(triggerCoverLetterInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;
		context.log?.set({
			action: "trigger_cover_letter",
			generation: { id: input.generationId },
			user: { id: userId },
		});

		const [gen] = await context.db
			.select({
				id: generations.id,
				language: generations.language,
				resumeId: generations.resumeId,
				title: generations.title,
				summary: generations.summary,
			})
			.from(generations)
			.where(
				and(eq(generations.id, input.generationId), eq(generations.owner, userId), eq(generations.type, "cover-letter"))
			)
			.limit(1);

		if (!gen) {
			context.log?.set({ outcome: "generation_not_found" });
			throw new ORPCError("NOT_FOUND", { message: "Carta no encontrada" });
		}

		if (!gen.resumeId) {
			context.log?.set({ outcome: "missing_resume" });
			throw new ORPCError("BAD_REQUEST", { message: "La carta no tiene un CV vinculado" });
		}

		if (!gen.title) {
			context.log?.set({ outcome: "missing_job_position" });
			throw new ORPCError("BAD_REQUEST", { message: "La carta no tiene un puesto definido" });
		}

		const effectiveLanguage = input.language ?? gen.language;

		const existing = await context.db
			.select({ order: messages.order, error: messages.error, objectType: messages.objectType })
			.from(messages)
			.where(eq(messages.generationId, gen.id));

		// Tope de versiones por carta, derivado del PLAN del usuario (no hardcodeado). Solo
		// cuentan artifacts no fallidos. Read-check no atómico: tope "suave" de UX, no de billing.
		const subscription = await getActiveSubscriptionForUser(context.db, userId);
		const maxVersions = resolveMaxVersions(getEffectiveEntitlements(subscription).cover_letter_versions);
		const versionCount = existing.filter((m) => m.objectType === COVER_LETTER_OBJECT_TYPE && m.error === null).length;
		if (versionCount >= maxVersions) {
			context.log?.set({ outcome: "version_limit_reached" });
			throw new ORPCError("BAD_REQUEST", {
				message: `Alcanzaste el límite de ${maxVersions} versiones para esta carta.`,
			});
		}

		// Language override: si el caller pidió cambiar idioma para este turno (preset
		// "En inglés" / "En español"), persistimos el switch para que re-triggers
		// posteriores arranquen en el idioma nuevo. Va DESPUÉS del check de límite (un
		// user al tope no debe quedar con el idioma cambiado sin carta que lo refleje)
		// y se invalida el cache al toque — aunque el dispatch de abajo falle, lo que
		// sirvan list/get debe coincidir con la DB.
		if (input.language && input.language !== gen.language) {
			await context.db.update(generations).set({ language: input.language }).where(eq(generations.id, gen.id));
			await invalidateViewerLetters(context.db, userId);
			context.log?.set({ languageChange: { from: gen.language, to: input.language } });
		}

		// `order` monotónico = max(order) + 1. NO usar el count de filas: es racy con
		// triggers concurrentes y se infla con los tool-messages que el task inserta luego.
		const maxOrder = existing.reduce((acc, m) => Math.max(acc, m.order ?? -1), -1);
		const baseOrder = maxOrder + 1;

		// Layout del turno para que en el chat los tool-calls salgan ANTES de su versión:
		//   [extraPrompt del user] → [tool-calls del task @ toolOrder] → [artifact @ artifactOrder]
		// El task inserta los tools en `artifactOrder - 1` (= toolOrder), justo antes.
		const toolOrder = input.extraPrompt ? baseOrder + 1 : baseOrder;
		const artifactOrder = toolOrder + 1;

		if (input.extraPrompt) {
			await context.db.insert(messages).values({
				generationId: gen.id,
				isAssistant: false,
				order: baseOrder,
				text: input.extraPrompt,
			});
		}

		// El id lo genera la DB ($defaultFn en el schema de messages). Lo leemos con
		// .returning() en vez de fabricarlo a mano.
		const [artifactRow] = await context.db
			.insert(messages)
			.values({
				generationId: gen.id,
				isAssistant: true,
				objectType: COVER_LETTER_OBJECT_TYPE,
				order: artifactOrder,
			})
			.returning({ id: messages.id });

		if (!artifactRow) {
			context.log?.set({ outcome: "insert_failed" });
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No pudimos iniciar la generación" });
		}
		const messageId = artifactRow.id;

		try {
			const idempotencyKey = await idempotencyKeys.create(`casey-letters-${messageId}`);

			const handle = await tasks.trigger<typeof caseyLettersTask>(
				"casey-letters",
				{
					extraPrompt: input.extraPrompt,
					generationId: gen.id,
					jobPosition: gen.title,
					jobDescription: gen.summary ?? undefined,
					language: effectiveLanguage,
					messageId,
					resumeId: gen.resumeId,
					userId,
				},
				{
					concurrencyKey: `letter-${gen.id}`,
					idempotencyKey,
					idempotencyKeyTTL: "24h",
					tags: [
						`user:${userId}`,
						`gen:${gen.id}`,
						`letter:${messageId}`,
						`lang:${effectiveLanguage}`,
						"agent:casey-letters",
					],
				}
			);

			await invalidateViewerLetters(context.db, userId);
			context.log?.set({
				message: { id: messageId },
				outcome: "triggered",
				run: { id: handle.id },
			});

			return {
				messageId,
				publicAccessToken: handle.publicAccessToken,
				runId: handle.id,
			};
		} catch (error) {
			context.log?.set({ outcome: "trigger_failed" });
			context.log?.error(error instanceof Error ? error : new Error("trigger_failed"));

			await context.db.update(messages).set({ error: "trigger_failed" }).where(eq(messages.id, messageId));

			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No pudimos iniciar la generación" });
		}
	}),

	/**
	 * Persist USER edits to a generated cover letter (the four sections are editable in the
	 * UI). Overwrites the targeted artifact message's `object` + `text` IN PLACE — it is not
	 * a new generation, so no quota is consumed and no task is triggered.
	 */
	updateArtifact: protectedProcedure
		.input(
			z.object({
				generationId: z.string().nonempty(),
				messageId: z.string().nonempty(),
				artifact: coverLetterSchema,
			})
		)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;
			context.log?.set({
				action: "update_cover_letter_artifact",
				generation: { id: input.generationId },
				message: { id: input.messageId },
				user: { id: userId },
			});

			// Ownership: the generation must belong to the user.
			const [gen] = await context.db
				.select({ id: generations.id })
				.from(generations)
				.where(
					and(
						eq(generations.id, input.generationId),
						eq(generations.owner, userId),
						eq(generations.type, "cover-letter")
					)
				)
				.limit(1);

			if (!gen) {
				context.log?.set({ outcome: "generation_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Carta no encontrada" });
			}

			// Scope the update to this generation's artifact message; the objectType guard makes
			// sure a non-artifact row (user/tool message) can never be overwritten, y el guard de
			// `error` impide "revivir" una versión fallida por edición (quedaría con object+error).
			const updated = await context.db
				.update(messages)
				.set({ object: input.artifact, text: input.artifact.body })
				.where(
					and(
						eq(messages.id, input.messageId),
						eq(messages.generationId, gen.id),
						eq(messages.objectType, COVER_LETTER_OBJECT_TYPE),
						isNull(messages.error)
					)
				)
				.returning({ id: messages.id });

			if (updated.length === 0) {
				context.log?.set({ outcome: "artifact_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Versión no encontrada" });
			}

			await invalidateViewerLetters(context.db, userId);
			context.log?.set({ outcome: "updated" });
			return { messageId: input.messageId, ok: true };
		}),
};

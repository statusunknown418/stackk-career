import { ORPCError } from "@orpc/client";
import { createId } from "@paralleldrive/cuid2";
import { generations } from "@stackk-career/db/schema/generations";
import { messages } from "@stackk-career/db/schema/messages";
import { resumes } from "@stackk-career/db/schema/resumes";
import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import { COVER_LETTER_OBJECT_TYPE, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import {
	createCoverLetterGenerationInputSchema,
	MAX_COVER_LETTER_VERSIONS,
	triggerCoverLetterInputSchema,
} from "@stackk-career/schemas/api/letters";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "..";

export const lettersRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		context.log?.set({ action: "list_cover_letters", user: { id: userId } });

		const rows = await context.db
			.select({
				id: generations.id,
				title: generations.title,
				resumeId: generations.resumeId,
				createdAt: generations.createdAt,
				updatedAt: generations.updatedAt,
			})
			.from(generations)
			.where(and(eq(generations.owner, userId), eq(generations.type, "cover-letter")))
			.orderBy(desc(generations.updatedAt))
			.$withCache();

		return rows;
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

			const [generation] = await context.db
				.select({
					id: generations.id,
					title: generations.title,
					summary: generations.summary,
					resumeId: generations.resumeId,
					language: generations.language,
					createdAt: generations.createdAt,
					updatedAt: generations.updatedAt,
				})
				.from(generations)
				.where(
					and(
						eq(generations.id, input.generationId),
						eq(generations.owner, userId),
						eq(generations.type, "cover-letter")
					)
				)
				.limit(1)
				.$withCache();

			if (!generation) {
				context.log?.set({ outcome: "not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Carta no encontrada" });
			}

			const linkedResume = generation.resumeId
				? ((
						await context.db
							.select({
								id: resumes.id,
								title: resumes.title,
								displayName: resumes.displayName,
							})
							.from(resumes)
							.where(and(eq(resumes.id, generation.resumeId), eq(resumes.userId, userId)))
							.limit(1)
							.$withCache()
					).at(0) ?? null)
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
			const latestArtifactMessage = [...messageRows]
				.reverse()
				.find((m) => m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE && m.object !== null);

			const latestArtifact = latestArtifactMessage?.object
				? (coverLetterSchema.safeParse(latestArtifactMessage.object).data ?? null)
				: null;

			return {
				generation,
				resume: linkedResume,
				messages: messageRows,
				latestArtifact,
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

		// Language override: si el caller pidió cambiar idioma para este turno (preset
		// "En inglés" / "En español"), persistimos el switch en el generation row antes
		// de disparar el task. Así re-triggers posteriores arrancan directamente en el
		// idioma nuevo sin volver a pasar el override.
		const effectiveLanguage = input.language ?? gen.language;
		if (input.language && input.language !== gen.language) {
			await context.db.update(generations).set({ language: input.language }).where(eq(generations.id, gen.id));
			context.log?.set({ languageChange: { from: gen.language, to: input.language } });
		}

		const existing = await context.db
			.select({ order: messages.order, error: messages.error, objectType: messages.objectType })
			.from(messages)
			.where(eq(messages.generationId, gen.id));

		// Límite de versiones (la UI lo refleja, pero el tope se valida acá). Solo cuentan
		// artifacts NO fallidos — un run que reventó no debe consumir cuota.
		// NOTA: es un read-check, no atómico. Cubre el caso común (triggers secuenciales + el
		// guard inFlightRef del cliente por pestaña). Dos triggers REALMENTE simultáneos
		// (multi-pestaña/dispositivo) podrían pasar ambos y dejar 6 versiones — tope "suave" de
		// UX, no de seguridad/billing. Un tope estrictamente atómico requeriría una constraint
		// de DB o transacción interactiva (a verificar contra Turso antes de shippear).
		const versionCount = existing.filter((m) => m.objectType === COVER_LETTER_OBJECT_TYPE && m.error === null).length;
		if (versionCount >= MAX_COVER_LETTER_VERSIONS) {
			context.log?.set({ outcome: "version_limit_reached" });
			throw new ORPCError("BAD_REQUEST", {
				message: `Alcanzaste el límite de ${MAX_COVER_LETTER_VERSIONS} versiones para esta carta.`,
			});
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

		const messageId = `msg_${createId()}`;
		await context.db.insert(messages).values({
			generationId: gen.id,
			id: messageId,
			isAssistant: true,
			objectType: COVER_LETTER_OBJECT_TYPE,
			order: artifactOrder,
		});

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
};

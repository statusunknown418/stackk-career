import { ORPCError } from "@orpc/client";
import { generations } from "@stackk-career/db/schema/generations";
import { messages } from "@stackk-career/db/schema/messages";
import { resumes } from "@stackk-career/db/schema/resumes";
import { COVER_LETTER_OBJECT_TYPE, type CoverLetter, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import {
	createCoverLetterGenerationInputSchema,
	triggerCoverLetterInputSchema,
} from "@stackk-career/schemas/api/letters";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "..";

/**
 * Sentinel artifact used by the `trigger` stub procedure below. Replaced by the
 * real CASEY-Letters Trigger.dev task in the next PR. When the real task lands,
 * `trigger` will dispatch a Trigger.dev run and return a `runId` +
 * `publicAccessToken` for the frontend to subscribe via
 * `useRealtimeRunWithStreams`. Until then, the UI receives this placeholder so
 * the end-to-end flow (create → navigate → render artifact) is exercised.
 */
const PLACEHOLDER_ARTIFACT: CoverLetter = {
	greeting: "Estimada/o:",
	body: "Esta es una versión preliminar. El task CASEY-Letters todavía no está conectado (se entrega en el PR siguiente). Una vez en línea, este artifact se completará con la carta real generada por Claude Sonnet 4.6 a partir del puesto y del CV vinculado.",
	closing: "Quedo atenta a tu respuesta.",
	signature: "— CASEY",
};

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
					resumeId: input.resumeId,
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
					resumeId: generations.resumeId,
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
				.orderBy(asc(messages.order), asc(messages.createdAt));

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
	 * STUB — replaced by the real CASEY-Letters Trigger.dev wiring in the next PR.
	 * For now: inserts an optional user message (if `extraPrompt` was provided),
	 * then an assistant message with `objectType=cover-letter-v1` carrying the
	 * sentinel artifact above. Returns `null` for runId/publicAccessToken so the
	 * UI can detect the stub state and skip realtime subscription.
	 */
	trigger: protectedProcedure.input(triggerCoverLetterInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;
		context.log?.set({
			action: "trigger_cover_letter_stub",
			user: { id: userId },
			generation: { id: input.generationId },
		});

		const [gen] = await context.db
			.select({ id: generations.id })
			.from(generations)
			.where(
				and(eq(generations.id, input.generationId), eq(generations.owner, userId), eq(generations.type, "cover-letter"))
			)
			.limit(1);

		if (!gen) {
			context.log?.set({ outcome: "generation_not_found" });
			throw new ORPCError("NOT_FOUND", { message: "Carta no encontrada" });
		}

		const existing = await context.db
			.select({ id: messages.id })
			.from(messages)
			.where(eq(messages.generationId, gen.id));
		const nextOrder = existing.length;

		if (input.extraPrompt) {
			await context.db.insert(messages).values({
				generationId: gen.id,
				isAssistant: false,
				order: nextOrder,
				text: input.extraPrompt,
			});
		}

		const [artifactMessage] = await context.db
			.insert(messages)
			.values({
				generationId: gen.id,
				isAssistant: true,
				order: input.extraPrompt ? nextOrder + 1 : nextOrder,
				objectType: COVER_LETTER_OBJECT_TYPE,
				object: PLACEHOLDER_ARTIFACT,
				text: PLACEHOLDER_ARTIFACT.body,
			})
			.returning({ id: messages.id });

		context.log?.set({
			outcome: "stub_inserted",
			message: { id: artifactMessage?.id },
		});

		return {
			runId: null,
			publicAccessToken: null,
			messageId: artifactMessage?.id ?? null,
			artifact: PLACEHOLDER_ARTIFACT,
		};
	}),
};

import { ORPCError } from "@orpc/client";
import { generations } from "@stackk-career/db/schema/generations";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeJobTargets } from "@stackk-career/db/schema/resume-job-targets";
import { resumes } from "@stackk-career/db/schema/resumes";
import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import { COVER_LETTER_OBJECT_TYPE, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import {
	createCoverLetterGenerationInputSchema,
	triggerCoverLetterInputSchema,
} from "@stackk-career/schemas/api/letters";
import { formatJobTargetContext } from "@stackk-career/schemas/jobs/job-target-context";
import { jobPostingSchema } from "@stackk-career/schemas/jobs/linkedin-job-fetch";
import { getEffectiveEntitlements, isUnlimited, type LimitValue } from "@stackk-career/schemas/subscriptions";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "..";
import { invalidateViewerLetters, invalidateViewerUsage, viewerLettersTag } from "../lib/viewer-cache";
import { assertSingleQuota, getActiveSubscriptionForUser } from "../services/subscriptions";

const PREVIEW_MAX_CHARS = 180;
const WHITESPACE_RE = /\s+/g;

/** First ~180 chars of the body on one line, for the list card. */
function toPreview(text: string): string {
	const clean = text.replace(WHITESPACE_RE, " ").trim();
	return clean.length > PREVIEW_MAX_CHARS ? `${clean.slice(0, PREVIEW_MAX_CHARS).trimEnd()}…` : clean;
}

/** The plan's `cover_letter_versions` limit as a number (no plan leaves it "unlimited" today). */
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
				// CASEY's clean "Role · Company" label; null until first generation. The card
				// prefers it over the raw `title` (which may be a pasted job-posting URL).
				documentTitle: generations.documentTitle,
				resumeId: generations.resumeId,
				// Base CV of the letter — differentiates list entries (several letters can share a
				// role but use different CVs). leftJoin: the CV may not exist.
				resumeTitle: resumes.title,
				language: generations.language,
				template: generations.template,
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

		// Preview = body of each letter's latest version (messages.text = artifact body).
		// One `inArray` query avoids N+1; in JS keep the highest `order` per letter.
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
				source: input.source,
				user: { id: userId },
				resume: { id: input.resumeId },
			});

			// Free 2 / Pro 5 / Max 100 cover letters per billing cycle (mirrors resumes_total).
			await assertSingleQuota(context.db, userId, "cover_letter_generations_per_cycle");

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

			// Resolve the letter's job context. `resume-job-target` snapshots the resume's
			// READY target into title/summary so the letter stays stable if the target later
			// changes; `manual` uses the job position/description the user typed.
			let title: string;
			let summary: string | undefined;

			if (input.source === "resume-job-target") {
				const [target] = await context.db
					.select({
						status: resumeJobTargets.status,
						title: resumeJobTargets.title,
						company: resumeJobTargets.company,
						location: resumeJobTargets.location,
						employmentType: resumeJobTargets.employmentType,
						seniority: resumeJobTargets.seniority,
						structured: resumeJobTargets.structured,
					})
					.from(resumeJobTargets)
					.where(and(eq(resumeJobTargets.resumeId, input.resumeId), eq(resumeJobTargets.userId, userId)))
					.limit(1);

				context.log?.set({ jobTargetStatus: target?.status ?? "missing" });

				if (!target || target.status === "failed") {
					context.log?.set({ outcome: "job_target_unavailable" });
					throw new ORPCError("BAD_REQUEST", {
						message: "Este CV no tiene una oferta lista. Cambia la oferta o escribe el puesto manualmente.",
					});
				}

				if (target.status !== "ready") {
					context.log?.set({ outcome: "job_target_not_ready" });
					throw new ORPCError("BAD_REQUEST", {
						message: "Aún estamos leyendo la oferta. Inténtalo de nuevo en unos segundos.",
					});
				}

				const parsedPosting = jobPostingSchema.safeParse(target.structured);
				const { roleLabel, contextText } = formatJobTargetContext(
					{
						title: target.title,
						company: target.company,
						location: target.location,
						employmentType: target.employmentType,
						seniority: target.seniority,
						posting: parsedPosting.success ? parsedPosting.data : null,
					},
					{ maxChars: 5000 }
				);

				if (!roleLabel) {
					context.log?.set({ outcome: "job_target_no_role_label" });
					throw new ORPCError("BAD_REQUEST", {
						message: "La oferta guardada no tiene un puesto definido. Escribe el puesto manualmente.",
					});
				}

				title = roleLabel;
				summary = contextText || undefined;
				context.log?.set({ jobTargetStructuredParsed: parsedPosting.success });
			} else {
				if (!input.jobPosition) {
					context.log?.set({ outcome: "missing_job_position" });
					throw new ORPCError("BAD_REQUEST", { message: "Indica el puesto al que vas a postular." });
				}
				title = input.jobPosition;
				summary = input.jobDescription;
			}

			const [created] = await context.db
				.insert(generations)
				.values({
					owner: userId,
					type: "cover-letter",
					title,
					summary,
					resumeId: input.resumeId,
					language: input.language,
					template: input.template,
					jobContextSource: input.source,
				})
				.returning({ id: generations.id });

			if (!created) {
				context.log?.set({ outcome: "insert_failed" });
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "No pudimos crear la carta" });
			}

			await invalidateViewerLetters(context.db, userId);
			await invalidateViewerUsage(context.db, userId, ["cover_letter_generations_per_cycle"]);
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

			// Single query: the generation + (leftJoin) its linked CV. The FE uses
			// resume.title/displayName on /letters/:id.
			const [row] = await context.db
				.select({
					id: generations.id,
					title: generations.title,
					summary: generations.summary,
					resumeId: generations.resumeId,
					language: generations.language,
					template: generations.template,
					jobContextSource: generations.jobContextSource,
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
				// `rowid` (insertion order) as final tiebreak: order + createdAt (seconds) can tie —
				// the 2 tool rows share order, and concurrent triggers can collide on order. rowid
				// guarantees a stable, deterministic render.
				.orderBy(asc(messages.order), asc(messages.createdAt), sql`rowid`);

			// Latest assistant message tagged as a cover-letter artifact = current letter.
			// `error === null`: same "valid version" criterion as the FE — a row with both object
			// AND error (half-retried run) must not show as a letter.
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
	 * Delete a cover-letter generation and its whole chat/version history.
	 * Ownership is enforced (owner + type), children go first (no FK cascade), and the
	 * viewer's cached reads + per-cycle counter are busted so the freed slot is reflected.
	 */
	delete: protectedProcedure
		.input(z.object({ generationId: z.string().nonempty() }))
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;
			context.log?.set({
				action: "delete_cover_letter",
				user: { id: userId },
				generation: { id: input.generationId },
			});

			// Only a cover-letter generation owned by this user can be deleted.
			const [owned] = await context.db
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

			if (!owned) {
				context.log?.set({ outcome: "not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Carta no encontrada" });
			}

			// `messages.generationId` -> `generations.id` has no ON DELETE cascade, so the chat
			// and artifact rows must be removed before the generation or the delete fails the FK.
			await context.db.delete(messages).where(eq(messages.generationId, owned.id));
			await context.db.delete(generations).where(and(eq(generations.id, owned.id), eq(generations.owner, userId)));

			// `list`/`get` are cached per viewer; deleting also frees one per-cycle slot.
			await invalidateViewerLetters(context.db, userId);
			await invalidateViewerUsage(context.db, userId, ["cover_letter_generations_per_cycle"]);

			context.log?.set({ outcome: "success" });
			return { deleted: { id: owned.id } };
		}),

	/**
	 * Dispatch a CASEY-Letters Trigger.dev run. The task picks up the candidate's CV
	 * via `resumeId` and the target role via the generation's `title`. The pending
	 * artifact message is inserted BEFORE the trigger so the UI can render its row
	 * immediately; the task fills `object` + `text` on completion, or `onFailure`
	 * stamps an `error` on the same row.
	 *
	 * Pattern mirrors `agents.triggerK02FastAnalysis`: concurrencyKey scoped to the
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
				jobContextSource: generations.jobContextSource,
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

		// Per-letter version cap derived from the user's PLAN. Only non-failed artifacts count.
		// Non-atomic read-check: a soft UX cap, not billing enforcement.
		const subscription = await getActiveSubscriptionForUser(context.db, userId);
		const maxVersions = resolveMaxVersions(getEffectiveEntitlements(subscription).cover_letter_versions);
		const versionCount = existing.filter((m) => m.objectType === COVER_LETTER_OBJECT_TYPE && m.error === null).length;
		if (versionCount >= maxVersions) {
			context.log?.set({ outcome: "version_limit_reached" });
			throw new ORPCError("BAD_REQUEST", {
				message: `Alcanzaste el límite de ${maxVersions} versiones para esta carta.`,
			});
		}

		// Language override: persist the switch so later re-triggers start in the new language.
		// Must run AFTER the limit check (a capped user must not end up with a switched language
		// and no letter reflecting it), and the cache is invalidated immediately so list/get
		// match the DB even if the dispatch below fails.
		if (input.language && input.language !== gen.language) {
			await context.db.update(generations).set({ language: input.language }).where(eq(generations.id, gen.id));
			await invalidateViewerLetters(context.db, userId);
			context.log?.set({ languageChange: { from: gen.language, to: input.language } });
		}

		// Monotonic `order` = max(order) + 1. Do NOT use the row count: racy with concurrent
		// triggers and inflated by the tool messages the task inserts later.
		const maxOrder = existing.reduce((acc, m) => Math.max(acc, m.order ?? -1), -1);
		const baseOrder = maxOrder + 1;

		// Turn layout so tool calls render BEFORE their version in the chat:
		//   [user extraPrompt] → [task tool-calls @ toolOrder] → [artifact @ artifactOrder]
		// The task inserts tools at `artifactOrder - 1` (= toolOrder).
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

		// The id comes from the DB ($defaultFn in the messages schema), read via .returning().
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
					jobContextSource: gen.jobContextSource,
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

			// Scope the update to this generation's artifact message; the objectType guard keeps
			// non-artifact rows (user/tool messages) from being overwritten, and the `error` guard
			// keeps an edit from "reviving" a failed version (it would end up with object+error).
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

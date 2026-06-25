import { ORPCError } from "@orpc/client";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumeJobTargets } from "@stackk-career/db/schema/resume-job-targets";
import { resumes } from "@stackk-career/db/schema/resumes";
import { resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import {
	changeResumeJobTargetSchema,
	createResumeInputSchema,
	getResumeAnalysisInputSchema,
	listResumesInputSchema,
	updateResumeTitleSchema,
} from "@stackk-career/schemas/api/resumes";
import { jobPostingSchema } from "@stackk-career/schemas/jobs/linkedin-job-fetch";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "..";
import { buildResumeRootSeed, buildStarterChildBlocks } from "../lib/resume-block-starters";
import { summarizeContactBlock } from "../lib/resume-contact";
import { invalidateViewerUsage } from "../lib/viewer-cache";
import { changeResumeJobTarget, startResumeJobTargetFetch } from "../services/resume-job-targets";
import { assertSingleQuota } from "../services/subscriptions";

export const resumesRouter = {
	list: protectedProcedure.input(listResumesInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		const userResumes = await context.db
			.select()
			.from(resumes)
			.where(eq(resumes.userId, userId))
			.limit(input.limit)
			.offset(input.offset)
			.$withCache();

		context.log?.set({
			action: "get_resumes",
			outcome: "success",
			records: userResumes.length,
		});

		if (!userResumes.length) {
			return [];
		}

		const resumeIds = userResumes.map((res) => res.id);

		const contactBlocks = await context.db
			.select()
			.from(resumeBlocks)
			.where(
				and(
					isNull(resumeBlocks.parentBlockId),
					isNull(resumeBlocks.deletedAt),
					eq(resumeBlocks.blockType, "contact"),
					inArray(resumeBlocks.resumeId, resumeIds)
				)
			)
			.$withCache();

		context.log?.set({
			action: "get_resume_blocks",
			outcome: "success",
			records: userResumes.length,
		});

		const contactByResume = new Map(contactBlocks.map((raw) => [raw.resumeId, summarizeContactBlock(raw)] as const));

		const jobTargetRows = await context.db
			.select({ resumeId: resumeJobTargets.resumeId, status: resumeJobTargets.status })
			.from(resumeJobTargets)
			.where(inArray(resumeJobTargets.resumeId, resumeIds))
			.$withCache();

		const jobTargetStatusByResume = new Map(jobTargetRows.map((row) => [row.resumeId, row.status]));

		return userResumes.map((res) => ({
			...res,
			contact: contactByResume.get(res.id),
			jobTargetStatus: jobTargetStatusByResume.get(res.id) ?? null,
		}));
	}),

	create: protectedProcedure.input(createResumeInputSchema).handler(async ({ context, input }) => {
		const { email, id: userId, name } = context.session.user;

		await assertSingleQuota(context.db, userId, "resumes_total");

		const title = input.targetRole ?? "CV sin título";

		const newResume = await context.db.transaction(async (tx) => {
			const [createdGeneration] = await tx
				.insert(generations)
				.values({ owner: userId, type: "resume-manual", title })
				.returning({ id: generations.id });

			if (!createdGeneration) {
				return null;
			}

			const [createdResume] = await tx
				.insert(resumes)
				.values({
					userId,
					title,
					displayName: title,
					targetRole: input.targetRole,
					generationId: createdGeneration.id,
				})
				.returning({ id: resumes.id });

			if (!createdResume) {
				return null;
			}

			const { rootBlocks, sectionContentByPosition } = buildResumeRootSeed({
				email,
				name,
				resumeId: createdResume.id,
			});

			const createdRootBlocks = await tx.insert(resumeBlocks).values(rootBlocks).returning({
				id: resumeBlocks.id,
				blockType: resumeBlocks.blockType,
				position: resumeBlocks.position,
			});

			const createdSections = createdRootBlocks.filter((block) => block.blockType === "section");

			if (createdSections.length !== sectionContentByPosition.size) {
				return null;
			}

			const starterChildBlocks = buildStarterChildBlocks({
				createdSections,
				resumeId: createdResume.id,
				sectionContentByPosition,
			});

			if (starterChildBlocks.length > 0) {
				await tx.insert(resumeBlocks).values(starterChildBlocks);
			}

			return createdResume;
		});

		if (!newResume) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Algo ocurrió al crear tu CV",
				cause: "malformed_data_or_unknown",
			});
		}

		await invalidateViewerUsage(context.db, userId, ["resumes_total"]);

		// Best-effort: a failed job-target fetch must never break resume creation (already committed).
		const jobTarget = input.targetJobUrl
			? await startResumeJobTargetFetch({
					db: context.db,
					log: context.log,
					resumeId: newResume.id,
					sourceUrl: input.targetJobUrl,
					userId,
				})
			: undefined;

		context.log?.set({
			outcome: "success",
			action: "create_resume",
			data: {
				newResume,
			},
		});

		return {
			success: true,
			resumeId: newResume.id,
			jobTarget,
		};
	}),

	get: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_resume",
			data: {
				resumeId: input.id,
			},
		});

		const [resume] = await context.db
			.select()
			.from(resumes)
			.where(and(eq(resumes.id, input.id), eq(resumes.userId, userId)))
			.$withCache();

		if (!resume) {
			throw new ORPCError("NOT_FOUND", {
				message: "CV no encontrado",
			});
		}

		const blocks = await context.db
			.select()
			.from(resumeBlocks)
			.where(and(eq(resumeBlocks.resumeId, resume.id), isNull(resumeBlocks.deletedAt)));

		const activeBlockTypes = Array.from(new Set(blocks.map((block) => block.blockType)));

		context.log?.set({
			action: "get_resume_blocks",
			outcome: "success",
			records: blocks.length,
		});

		return {
			...resume,
			blocks,
			activeBlockTypes,
		};
	}),

	delete: protectedProcedure.input(z.object({ id: z.string() })).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "delete_resume",
			data: {
				resumeId: input.id,
			},
		});

		const [deleted, blocks] = await Promise.allSettled([
			context.db
				.delete(resumes)
				.where(and(eq(resumes.userId, userId), eq(resumes.id, input.id)))
				.returning({ id: resumes.id }),
			context.db.delete(resumeBlocks).where(eq(resumeBlocks.resumeId, input.id)).returning({
				id: resumeBlocks.id,
			}),
		]);

		if (deleted.status === "rejected" || blocks.status === "rejected") {
			throw new ORPCError("UNPROCESSABLE_CONTENT", {
				message: "Algo ocurrió al borrar el cv",
			});
		}

		context.log?.set({
			action: "delete_resume",
			outcome: "success",
		});

		return { deleted, blocks };
	}),

	getResumeAnalysis: protectedProcedure.input(getResumeAnalysisInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_resume_analysis",
			user: { id: userId },
			resume: { id: input.resumeId },
		});

		const [row] = await context.db
			.select({
				id: resumeAnalyses.id,
				object: resumeAnalyses.object,
				editStatuses: resumeAnalyses.editStatuses,
			})
			.from(resumeAnalyses)
			.where(
				and(
					eq(resumeAnalyses.resumeId, input.resumeId),
					eq(resumeAnalyses.userId, userId),
					eq(resumeAnalyses.status, "ready")
				)
			)
			.orderBy(desc(resumeAnalyses.createdAt))
			.limit(1);

		if (!row?.object) {
			context.log?.set({ outcome: "not_found" });
			return null;
		}

		const parsed = resumeAnalysisSchema.safeParse(row.object);
		if (!parsed.success) {
			context.log?.set({ outcome: "invalid", analysis: { id: row.id } });
			return null;
		}

		context.log?.set({ outcome: "found", analysis: { id: row.id } });
		return {
			id: row.id,
			analysis: parsed.data,
			editStatuses: row.editStatuses,
		};
	}),

	updateTitle: protectedProcedure.input(updateResumeTitleSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		const [updatedResume] = await context.db
			.update(resumes)
			.set({
				title: input.title,
			})
			.where(and(eq(resumes.id, input.id), eq(resumes.userId, userId)))
			.returning();

		if (!updatedResume) {
			throw new ORPCError("NOT_FOUND", {
				message: "CV no encontrado",
			});
		}

		return updatedResume;
	}),

	getJobTarget: protectedProcedure.input(z.object({ resumeId: z.string() })).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		const [row] = await context.db
			.select({
				id: resumeJobTargets.id,
				status: resumeJobTargets.status,
				sourceUrl: resumeJobTargets.sourceUrl,
				title: resumeJobTargets.title,
				company: resumeJobTargets.company,
				location: resumeJobTargets.location,
				employmentType: resumeJobTargets.employmentType,
				seniority: resumeJobTargets.seniority,
				structured: resumeJobTargets.structured,
				error: resumeJobTargets.error,
			})
			.from(resumeJobTargets)
			.where(and(eq(resumeJobTargets.resumeId, input.resumeId), eq(resumeJobTargets.userId, userId)))
			.limit(1);

		if (!row) {
			return null;
		}

		const structured = jobPostingSchema.safeParse(row.structured);
		return { ...row, structured: structured.success ? structured.data : null };
	}),

	changeJobTarget: protectedProcedure.input(changeResumeJobTargetSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		const [resume] = await context.db
			.select({ id: resumes.id })
			.from(resumes)
			.where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)))
			.limit(1);

		if (!resume) {
			throw new ORPCError("NOT_FOUND", { message: "No encontramos este CV" });
		}

		const handle = await changeResumeJobTarget({
			db: context.db,
			log: context.log,
			resumeId: input.resumeId,
			sourceUrl: input.targetJobUrl,
			userId,
		});

		if (!handle) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "No pudimos actualizar el objetivo. Intenta de nuevo en unos minutos.",
			});
		}

		context.log?.set({
			outcome: "success",
			action: "change_job_target",
			data: { resumeId: input.resumeId },
		});

		return { success: true, status: "pending" as const };
	}),
};

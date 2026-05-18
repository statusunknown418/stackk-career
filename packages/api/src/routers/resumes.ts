import { ORPCError } from "@orpc/client";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { blankResumeSections, updateResumeTitleSchema } from "@stackk-career/schemas/api/resumes";
import { parseBlock } from "@stackk-career/schemas/db/resume-blocks";
import { generateLexoKeyBetween } from "@stackk-career/schemas/utils/lexographical";
import { constructNow, formatDate } from "date-fns";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "..";
import { createContactSeedBlock, createStarterChildPayload } from "../lib/resume-block-starters";
import { invalidateViewerUsage } from "../lib/viewer-cache";

export const resumesRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		const userResumes = await context.db.select().from(resumes).where(eq(resumes.userId, userId)).$withCache();

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

		const mappedResumeWithRightBlock = new Map(
			contactBlocks.map((raw) => {
				const block = parseBlock(raw);

				if (block.blockType !== "contact") {
					return [raw.resumeId, null];
				}

				return [
					raw.resumeId,
					{
						firstName: block.content.firstName,
						lastName: block.content.lastName,
					},
				];
			})
		);

		return userResumes.map((res) => ({
			...res,
			contact: mappedResumeWithRightBlock.get(res.id),
		}));
	}),

	create: protectedProcedure.handler(async ({ context }) => {
		const { email, id: userId, name } = context.session.user;

		const now = constructNow(new Date());
		const firstChildPosition = generateLexoKeyBetween(null, null);

		const title = `Nuevo CV - ${formatDate(now, "PPP")}`;

		const newResume = await context.db.transaction(async (tx) => {
			const [createdGeneration] = await tx
				.insert(generations)
				.values({
					owner: userId,
					type: "resume-creation",
					title,
				})
				.returning({ id: generations.id });

			if (!createdGeneration) {
				return null;
			}

			const [createdResume] = await tx
				.insert(resumes)
				.values({
					userId,
					title,
					generationId: createdGeneration.id,
				})
				.returning({
					id: resumes.id,
				});

			if (!createdResume) {
				return null;
			}

			let previousRootPosition: string | null = null;
			const contactPosition = generateLexoKeyBetween(previousRootPosition, null);
			const contactSeedBlock = createContactSeedBlock(createdResume.id, name, email, contactPosition);

			previousRootPosition = contactPosition;

			const sectionSeedBlocks = blankResumeSections.map((section) => {
				const position = generateLexoKeyBetween(previousRootPosition, null);

				previousRootPosition = position;

				return {
					resumeId: createdResume.id,
					blockType: "section" as const,
					position,
					content: section,
				};
			});

			const sectionSeedBlocksByPosition = new Map(
				sectionSeedBlocks.map((section) => [section.position, section.content] as const)
			);

			const createdRootBlocks = await tx
				.insert(resumeBlocks)
				.values([contactSeedBlock, ...sectionSeedBlocks])
				.returning({
					id: resumeBlocks.id,
					blockType: resumeBlocks.blockType,
					position: resumeBlocks.position,
				});

			const createdSectionBlocks = createdRootBlocks.filter((block) => block.blockType === "section");

			if (createdSectionBlocks.length !== blankResumeSections.length) {
				return null;
			}

			const starterChildBlocks = createdSectionBlocks.map((block) => {
				const section = sectionSeedBlocksByPosition.get(block.position);

				if (!section) {
					throw new Error(`Missing section seed metadata for position: ${block.position}`);
				}

				const starterChild = createStarterChildPayload(section.layout);

				return {
					resumeId: createdResume.id,
					parentBlockId: block.id,
					blockType: starterChild.blockType,
					content: starterChild.content,
					position: firstChildPosition,
				};
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

		await invalidateViewerUsage(context.db, userId, ["resumes_total", "resume_creation_generations_per_cycle"]);

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
};

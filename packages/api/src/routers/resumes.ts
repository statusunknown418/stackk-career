import { ORPCError } from "@orpc/client";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { parseBlock } from "@stackk-career/schemas/ai/resume-blocks";
import { formatDate } from "date-fns";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { protectedProcedure } from "..";

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
			);

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
		const userId = context.session.user.id;

		const now = new Date();

		const [newResume] = await context.db
			.insert(resumes)
			.values({
				userId,
				title: `Nuevo CV - ${formatDate(now, "PPP")}`,
			})
			.returning({
				id: resumes.id,
			});

		if (!newResume) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Algo ocurrió al crear tu CV",
				cause: "malformed_data_or_unknown",
			});
		}

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
};

import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { parseBlock } from "@stackk-career/schemas/ai/resume-blocks";
import { listResumesInputSchema } from "@stackk-career/schemas/api/resumes";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { protectedProcedure } from "..";

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
};

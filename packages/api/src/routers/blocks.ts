import { ORPCError } from "@orpc/client";
import { insertResumeBlocks, parseBlock, resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { protectedProcedure } from "..";
import { generateLexoKeyBetween } from "../indexing";

export const createBlockApiMutationSchema = insertResumeBlocks.extend({
	before: z.string().nullable(),
	after: z.string().nullable(),
});

export const blocksRouter = {
	create: protectedProcedure.input(createBlockApiMutationSchema).handler(async ({ context, input }) => {
		const [resume] = await context.db
			.select({ id: resumes.id })
			.from(resumes)
			.where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, context.session.session.userId)))
			.limit(1)
			.$withCache();

		if (!resume) {
			context.log?.set({ outcome: "resume_not_found" });

			throw new ORPCError("NOT_FOUND", {
				message: "Resume not found",
			});
		}

		const parentId = input.parentBlockId;

		if (parentId) {
			const [parent] = await context.db
				.select()
				.from(resumeBlocks)
				.where(and(eq(resumeBlocks.id, parentId), eq(resumeBlocks.resumeId, input.resumeId)))
				.limit(1)
				.$withCache();

			if (!parent) {
				context.log?.set({ outcome: "parent_block_not_found" });
				throw new ORPCError("NOT_FOUND", { message: `Parent block not found: ${parentId}` });
			}

			if (parent.deletedAt) {
				context.log?.set({ outcome: "parent_block_deleted" });
				throw new ORPCError("NOT_FOUND", { message: `Parent block is deleted: ${parentId}` });
			}
		}

		const position = generateLexoKeyBetween(input.before, input.after);

		const [newBlock] = await context.db
			.insert(resumeBlocks)
			.values({
				resumeId: input.resumeId,
				parentBlockId: input.parentBlockId,
				blockType: input.blockType,
				content: input.content,
				position,
			})
			.returning();

		if (!newBlock) {
			context.log?.error({
				message: "Algo ocurrió al crear este block",
				name: "block_insert_failed",
			});

			throw new ORPCError("BAD_REQUEST", {
				message: "Algo ocurrió al crear este block",
			});
		}

		return parseBlock(newBlock);
	}),
};

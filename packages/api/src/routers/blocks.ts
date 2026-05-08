import { ORPCError } from "@orpc/client";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { createBlockApiMutationSchema, updateBlockApiMutationSchema } from "@stackk-career/schemas/api/blocks";
import { parseBlock, sanitizeResumeRichTextHtml } from "@stackk-career/schemas/db/resume-blocks";
import { generateLexoKeyBetween } from "@stackk-career/schemas/utils/lexographical";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "..";
import { createStarterChildPayload } from "../lib/resume-block-starters";

const sanitizeBlockContent = (input: { blockType: string; content: Record<string, unknown> }) => {
	if (input.blockType === "paragraph" && input.content.format === "html" && typeof input.content.text === "string") {
		return {
			...input.content,
			text: sanitizeResumeRichTextHtml(input.content.text),
		};
	}

	if (input.blockType === "bullet" && input.content.format === "html" && typeof input.content.text === "string") {
		return {
			...input.content,
			text: sanitizeResumeRichTextHtml(input.content.text),
		};
	}

	if (
		input.blockType === "entry" &&
		input.content.descriptorFormat === "html" &&
		typeof input.content.descriptor === "string"
	) {
		return {
			...input.content,
			descriptor: sanitizeResumeRichTextHtml(input.content.descriptor),
		};
	}

	return input.content;
};

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
				message: "No se encontró tu CV",
			});
		}

		const parentId = input.parentBlockId;

		if (parentId) {
			const [parent] = await context.db
				.select({ deletedAt: resumeBlocks.deletedAt, id: resumeBlocks.id })
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
		const sanitizedContent = sanitizeBlockContent({
			blockType: input.blockType,
			content: input.content as Record<string, unknown>,
		});

		const newBlock = await context.db.transaction(async (tx) => {
			const [createdBlock] = await tx
				.insert(resumeBlocks)
				.values({
					resumeId: input.resumeId,
					parentBlockId: input.parentBlockId,
					blockType: input.blockType,
					content: sanitizedContent,
					position,
				})
				.returning();

			if (!createdBlock) {
				return null;
			}

			if (input.blockType === "section") {
				const starterChild = createStarterChildPayload(input.content.layout);

				await tx.insert(resumeBlocks).values({
					resumeId: input.resumeId,
					parentBlockId: createdBlock.id,
					blockType: starterChild.blockType,
					content: starterChild.content,
					position: generateLexoKeyBetween(null, null),
				});
			}

			return createdBlock;
		});

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

	update: protectedProcedure.input(updateBlockApiMutationSchema).handler(async ({ context, input }) => {
		const [resume] = await context.db
			.select({ id: resumes.id })
			.from(resumes)
			.where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, context.session.session.userId)))
			.limit(1)
			.$withCache();

		if (!resume) {
			context.log?.set({ outcome: "resume_not_found" });

			throw new ORPCError("NOT_FOUND", {
				message: "No se encontró tu CV",
			});
		}

		const [existingBlock] = await context.db
			.select({
				blockType: resumeBlocks.blockType,
				deletedAt: resumeBlocks.deletedAt,
				id: resumeBlocks.id,
				resumeId: resumeBlocks.resumeId,
			})
			.from(resumeBlocks)
			.where(and(eq(resumeBlocks.id, input.id), eq(resumeBlocks.resumeId, input.resumeId)))
			.limit(1)
			.$withCache();

		if (!existingBlock || existingBlock.deletedAt) {
			context.log?.set({ outcome: "block_not_found" });

			throw new ORPCError("NOT_FOUND", {
				message: "No se encontró bloque",
			});
		}

		if (existingBlock.blockType !== input.blockType) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Tipo de bloque inválido",
			});
		}

		const sanitizedContent = sanitizeBlockContent({
			blockType: input.blockType,
			content: input.content as Record<string, unknown>,
		});

		const [updatedBlock] = await context.db
			.update(resumeBlocks)
			.set({
				content: sanitizedContent,
			})
			.where(and(eq(resumeBlocks.id, input.id), eq(resumeBlocks.resumeId, input.resumeId)))
			.returning();

		if (!updatedBlock) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No se pudo actualizar bloque",
			});
		}

		return parseBlock(updatedBlock);
	}),
};

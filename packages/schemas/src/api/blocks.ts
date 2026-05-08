import { z } from "zod";
import { blockPayloadSchema, insertResumeBlocksSchema } from "../db/resume-blocks";

export const createBlockApiMutationSchema = insertResumeBlocksSchema
	.omit({
		blockType: true,
		content: true,
		position: true,
	})
	.extend({
		before: z.string().nullable(),
		after: z.string().nullable(),
	})
	.and(blockPayloadSchema);

export type CreateBlockApiMutationInput = z.infer<typeof createBlockApiMutationSchema>;

export const updateBlockApiMutationSchema = z
	.object({
		id: z.number().int(),
		resumeId: z.string(),
	})
	.and(blockPayloadSchema);

export type UpdateBlockApiMutationInput = z.infer<typeof updateBlockApiMutationSchema>;

import { z } from "zod";
import { blockPayloadSchema } from "../ai/resume-blocks";
import { insertResumeBlocksSchema } from "../db/resume-blocks";

export const createBlockApiMutationSchema = insertResumeBlocksSchema
	.extend({
		before: z.string().nullable(),
		after: z.string().nullable(),
	})
	.and(blockPayloadSchema);

export type CreateBlockApiMutationInput = z.infer<typeof createBlockApiMutationSchema>;

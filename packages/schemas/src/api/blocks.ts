import { z } from "zod";
import { insertResumeBlocksSchema } from "../db/resume-blocks";
import { blockPayloadSchema } from "../resume-blocks";

export const createBlockApiMutationSchema = insertResumeBlocksSchema
	.extend({
		before: z.string().nullable(),
		after: z.string().nullable(),
	})
	.and(blockPayloadSchema);

export type CreateBlockApiMutationInput = z.infer<typeof createBlockApiMutationSchema>;

import { z } from "zod";

export const listResumesInputSchema = z
	.object({
		limit: z.number().int().min(1).max(200).optional().default(50),
		offset: z.number().int().min(0).optional().default(0),
	})
	.optional()
	.default({ limit: 50, offset: 0 });

export type ListResumesInput = z.infer<typeof listResumesInputSchema>;

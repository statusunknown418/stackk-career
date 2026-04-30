import { z } from "zod";

export const createMessageInputSchema = z.object({
	generationId: z.string().nonempty(),
	text: z.string(),
	isAssistant: z.boolean(),
	order: z.number().int().nonnegative(),
	parentMessageId: z.string().optional(),
});

export const listMessagesInputSchema = z.object({ generationId: z.string().nonempty() });

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesInputSchema>;

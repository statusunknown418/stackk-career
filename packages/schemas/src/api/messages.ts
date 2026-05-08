import { z } from "zod";
import { insertMessageSchema } from "../db/messages";

export const createMessageInputSchema = insertMessageSchema.required({
	generationId: true,
	isAssistant: true,
	order: true,
	text: true,
});

export const listMessagesInputSchema = createMessageInputSchema.pick({ generationId: true }).extend({
	limit: z.number().int().min(1).max(200).optional().default(50),
	offset: z.number().int().min(0).optional().default(0),
});

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesInputSchema>;

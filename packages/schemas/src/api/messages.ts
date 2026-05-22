import type { z } from "zod";
import { insertMessageSchema } from "../db/messages";

export const createMessageInputSchema = insertMessageSchema.omit({ model: true }).required({
	generationId: true,
	isAssistant: true,
	order: true,
	text: true,
});

export const listMessagesInputSchema = createMessageInputSchema.pick({ generationId: true });

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesInputSchema>;

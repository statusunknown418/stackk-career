import { messages } from "@stackk-career/db/schema/messages";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectMessageSchema = createSelectSchema(messages);
export const insertMessageSchema = createInsertSchema(messages).strict();
export const updateMessageSchema = createUpdateSchema(messages);

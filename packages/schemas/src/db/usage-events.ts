import { usageEvents } from "@stackk-career/db/schema/usage-events";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectUsageEventSchema = createSelectSchema(usageEvents);
export const insertUsageEventSchema = createInsertSchema(usageEvents);
export const updateUsageEventSchema = createUpdateSchema(usageEvents);

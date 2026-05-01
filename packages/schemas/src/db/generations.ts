import { generations } from "@stackk-career/db/schema/generations";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectGenerationSchema = createSelectSchema(generations);
export const insertGenerationSchema = createInsertSchema(generations);
export const updateGenerationSchema = createUpdateSchema(generations);

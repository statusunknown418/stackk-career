import { resumes } from "@stackk-career/db/schema/resumes";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectResumeSchema = createSelectSchema(resumes);
export const insertResumeSchema = createInsertSchema(resumes).strict();
export const updateResumeSchema = createUpdateSchema(resumes);

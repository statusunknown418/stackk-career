import { resumes } from "@stackk-career/db/schema/resumes";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

export const insertResumeSchema = createInsertSchema(resumes);
export const updateResumeSchema = createUpdateSchema(resumes);

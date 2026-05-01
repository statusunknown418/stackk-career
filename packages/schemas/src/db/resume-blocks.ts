import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectResumeBlocksSchema = createSelectSchema(resumeBlocks);
export const insertResumeBlocksSchema = createInsertSchema(resumeBlocks);
export const updateResumeBlocksSchema = createUpdateSchema(resumeBlocks);

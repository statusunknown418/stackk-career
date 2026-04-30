import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

export const insertResumeBlocksSchema = createInsertSchema(resumeBlocks);
export const updateResumeBlocksSchema = createUpdateSchema(resumeBlocks);

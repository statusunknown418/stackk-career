import { resumeJobTargetStatusEnum, resumeJobTargets } from "@stackk-career/db/schema/resume-job-targets";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export { resumeJobTargetStatusEnum };
export type ResumeJobTargetStatus = (typeof resumeJobTargetStatusEnum)[number];

export const selectResumeJobTargetSchema = createSelectSchema(resumeJobTargets);
export const insertResumeJobTargetSchema = createInsertSchema(resumeJobTargets).strict();
export const updateResumeJobTargetSchema = createUpdateSchema(resumeJobTargets);

import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectResumeAnalysisSchema = createSelectSchema(resumeAnalyses);
export const insertResumeAnalysisSchema = createInsertSchema(resumeAnalyses);
export const updateResumeAnalysisSchema = createUpdateSchema(resumeAnalyses);

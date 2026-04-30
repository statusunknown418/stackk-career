import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

export const insertResumeAnalysisSchema = createInsertSchema(resumeAnalyses);
export const updateResumeAnalysisSchema = createUpdateSchema(resumeAnalyses);

import { coachingSessions } from "@stackk-career/db/schema/coaching-sessions";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectCoachingSessionSchema = createSelectSchema(coachingSessions);
export const insertCoachingSessionSchema = createInsertSchema(coachingSessions);
export const updateCoachingSessionSchema = createUpdateSchema(coachingSessions);

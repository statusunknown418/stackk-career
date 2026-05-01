import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectOnboardingProfileSchema = createSelectSchema(onboardingProfile);
export const insertOnboardingProfileSchema = createInsertSchema(onboardingProfile);
export const updateOnboardingProfileSchema = createUpdateSchema(onboardingProfile);

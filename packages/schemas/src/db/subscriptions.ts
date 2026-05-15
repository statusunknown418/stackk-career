import { billingEvents, userSubscriptions } from "@stackk-career/db/schema/subscriptions";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectUserSubscriptionSchema = createSelectSchema(userSubscriptions);
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions);
export const updateUserSubscriptionSchema = createUpdateSchema(userSubscriptions);

export const selectBillingEventSchema = createSelectSchema(billingEvents);
export const insertBillingEventSchema = createInsertSchema(billingEvents);
export const updateBillingEventSchema = createUpdateSchema(billingEvents);

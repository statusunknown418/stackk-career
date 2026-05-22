import { account, session, user, verification } from "@stackk-career/db/schema/auth";
import { createSelectSchema } from "drizzle-zod";

// Better Auth owns inserts/updates for these tables — only select schemas are exposed.
// Importers should never write to user/session/account/verification through app code;
// go through the Better Auth client/server APIs instead.

export const selectUserSchema = createSelectSchema(user);
export const selectSessionSchema = createSelectSchema(session);
export const selectAccountSchema = createSelectSchema(account);
export const selectVerificationSchema = createSelectSchema(verification);

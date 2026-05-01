import { insertUsageEventSchema } from "@stackk-career/schemas/db/usage-events";
import type { z } from "zod";

export const persistUsageEventInputSchema = insertUsageEventSchema.omit({
	id: true,
	createdAt: true,
});

export type PersistUsageEventInput = z.infer<typeof persistUsageEventInputSchema>;

import { z } from "zod";

export const realtimeTokenSchema = z.object({
	token: z.string().min(1),
	expiresAtMs: z.number().int().positive(),
});

export type RealtimeToken = z.infer<typeof realtimeTokenSchema>;

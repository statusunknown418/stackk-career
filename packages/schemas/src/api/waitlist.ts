import { z } from "zod";

export const joinWaitlistInputSchema = z.object({
	name: z.string().trim().min(1, "Ingresa tu nombre").max(120),
	phone: z.string().trim().min(6, "Ingresa un teléfono válido").max(30),
	// Optional — empty string is allowed and treated as "no email".
	email: z.union([z.string().trim().email("Correo inválido").max(160), z.literal("")]).optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistInputSchema>;

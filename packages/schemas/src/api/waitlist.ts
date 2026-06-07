import { z } from "zod";

export const joinWaitlistInputSchema = z.object({
	name: z.string().trim().min(1, "Ingresa tu nombre").max(120),
	phone: z.string().trim().min(6, "Ingresa un teléfono válido").max(30),
	email: z.email("Correo inválido").max(160).optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistInputSchema>;

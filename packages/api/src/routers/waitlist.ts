import { waitlist } from "@stackk-career/db/schema/waitlist";
import { joinWaitlistInputSchema } from "@stackk-career/schemas/api/waitlist";
import { publicProcedure } from "..";

export const waitlistRouter = {
	join: publicProcedure.input(joinWaitlistInputSchema).handler(async ({ context, input }) => {
		context.log?.set({ action: "join_waitlist", source: "landing-waitlist" });

		// Upsert por email: si alguien reenvía el mismo correo, actualizamos sus datos
		// en vez de reventar por el índice único. (Sin correo → siempre inserta.)
		await context.db
			.insert(waitlist)
			.values({
				name: input.name,
				phone: input.phone,
				email: input.email ?? null,
				source: "landing-waitlist",
			})
			.onConflictDoUpdate({
				target: waitlist.email,
				set: { name: input.name, phone: input.phone },
			});

		context.log?.set({ outcome: "joined" });
		return { ok: true };
	}),
};

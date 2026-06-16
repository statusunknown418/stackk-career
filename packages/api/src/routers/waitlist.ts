import { waitlist } from "@stackk-career/db/schema/waitlist";
import type { sendWaitlistEmailTask } from "@stackk-career/jobs/trigger/tasks/send-waitlist-email";
import { joinWaitlistInputSchema } from "@stackk-career/schemas/api/waitlist";
import { tasks } from "@trigger.dev/sdk";
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

		// Fire-and-forget confirmation email — only when an address was given, and
		// only enqueued (HTTP, ~ms). A Resend outage or enqueue failure must never
		// fail a signup we already persisted; the send runs in `send-waitlist-email`.
		if (input.email) {
			try {
				await tasks.trigger<typeof sendWaitlistEmailTask>("send-waitlist-email", {
					email: input.email,
					name: input.name,
				});
				context.log?.set({ waitlistEmail: "enqueued" });
			} catch (error) {
				context.log?.set({ waitlistEmail: "enqueue_failed" });
				context.log?.error(error instanceof Error ? error : new Error("waitlist_email_enqueue_failed"));
			}
		}

		context.log?.set({ outcome: "joined" });
		return { ok: true };
	}),
};

import { waitlist } from "@stackk-career/db/schema/waitlist";
import { joinWaitlistInputSchema } from "@stackk-career/schemas/api/waitlist";
import { publicProcedure } from "..";

export const waitlistRouter = {
	join: publicProcedure.input(joinWaitlistInputSchema).handler(async ({ context, input }) => {
		context.log?.set({ action: "join_waitlist", source: "landing-waitlist" });

		const email = input.email && input.email.length > 0 ? input.email : null;
		await context.db.insert(waitlist).values({
			name: input.name,
			phone: input.phone,
			email,
			source: "landing-waitlist",
		});

		context.log?.set({ outcome: "joined" });
		return { ok: true };
	}),
};

import { ORPCError } from "@orpc/client";
import { usageEvents } from "@stackk-career/db/schema/usage-events";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "..";

export const viewerRouter = {
	usage: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		try {
			const usage = await context.db.select().from(usageEvents).where(eq(usageEvents.userId, userId));

			const totalEvents = usage.length;

			const totalTokens = usage.map((item) => item.totalTokens).reduce((acc, curr) => acc + curr);

			const limitRemaning = 3;

			return {
				totalEvents,
				totalTokens,
				limitRemaning,
			};
		} catch (e) {
			context.log?.set({ outcome: "failed" });
			throw new ORPCError("BAD_REQUEST", {
				message: "Algo ocurrió",
				cause: e,
			});
		}
	}),
};

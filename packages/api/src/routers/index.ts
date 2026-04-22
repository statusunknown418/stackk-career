import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { aiRouter } from "./ai";
import { filesRelationsRouter } from "./files";

export const appRouter = {
	healthCheck: publicProcedure.handler(({ context }) => {
		context.log?.set({
			action: "health_check",
		});

		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		context.log?.set({
			action: "private_data",
		});

		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	files: filesRelationsRouter,
	ai: aiRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

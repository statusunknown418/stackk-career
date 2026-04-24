import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { aiRouter } from "./ai";
import { filesRelationsRouter } from "./files";
import { generationsRouter } from "./generations";
import { messagesRouter } from "./messages";
import { onboardingProfileRouter } from "./onboarding-profile";

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
	generations: generationsRouter,
	messages: messagesRouter,
	onboardingProfile: onboardingProfileRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

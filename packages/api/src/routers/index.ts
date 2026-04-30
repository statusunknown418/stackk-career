import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { agentsRouter } from "./agents";
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
	agents: agentsRouter,
	files: filesRelationsRouter,
	generations: generationsRouter,
	messages: messagesRouter,
	onboardingProfile: onboardingProfileRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

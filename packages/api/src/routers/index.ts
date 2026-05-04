import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { agentsRouter } from "./agents";
import { blocksRouter } from "./blocks";
import { filesMetadataRouter } from "./files-metadata";
import { generationsRouter } from "./generations";
import { messagesRouter } from "./messages";
import { onboardingProfileRouter } from "./onboarding-profile";
import { resumesRouter } from "./resumes";
import { viewerRouter } from "./viewer";

export const appRouter = {
	healthCheck: publicProcedure.handler(({ context }) => {
		context.log?.set({
			action: "health_check",
		});

		return "OK";
	}),
	agents: agentsRouter,
	filesMetadata: filesMetadataRouter,
	generations: generationsRouter,
	messages: messagesRouter,
	onboardingProfile: onboardingProfileRouter,
	viewer: viewerRouter,
	resumes: resumesRouter,
	blocks: blocksRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

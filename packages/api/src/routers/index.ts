import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { agentsRouter } from "./agents";
import { billingRouter } from "./billing";
import { blocksRouter } from "./blocks";
import { coachingRouter } from "./coaching";
import { filesMetadataRouter } from "./files-metadata";
import { generationsRouter } from "./generations";
import { messagesRouter } from "./messages";
import { onboardingProfileRouter } from "./onboarding-profile";
import { resumeAnalysesRouter } from "./resume-analyses";
import { resumesRouter } from "./resumes";
import { suggestionsRouter } from "./suggestions";
import { viewerRouter } from "./viewer";

export const appRouter = {
	healthCheck: publicProcedure.handler(({ context }) => {
		context.log?.set({
			action: "health_check",
		});

		return "OK";
	}),
	agents: agentsRouter,
	billing: billingRouter,
	filesMetadata: filesMetadataRouter,
	generations: generationsRouter,
	messages: messagesRouter,
	coaching: coachingRouter,
	onboardingProfile: onboardingProfileRouter,
	viewer: viewerRouter,
	resumes: resumesRouter,
	resumeAnalyses: resumeAnalysesRouter,
	blocks: blocksRouter,
	suggestions: suggestionsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;

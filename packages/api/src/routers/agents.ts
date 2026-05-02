import { ORPCError } from "@orpc/server";
import { generations } from "@stackk-career/db/schema/generations";
import type { resumeAgentTask } from "@stackk-career/jobs";
import { initiateResumeAnalysisInputSchema } from "@stackk-career/schemas/api/agents";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../";

export const agentsRouter = {
	initiateResumeAnalysis: protectedProcedure
		.input(initiateResumeAnalysisInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "trigger_resume_agent",
				user: { id: userId },
				generation: { id: input.generationId },
			});

			const [generation] = await context.db
				.select({ id: generations.id })
				.from(generations)
				.where(and(eq(generations.id, input.generationId), eq(generations.owner, userId)))
				.limit(1)
				.$withCache();

			if (!generation) {
				context.log?.set({ outcome: "generation_not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Generation not found" });
			}

			try {
				const idempotencyKey = await idempotencyKeys.create(`resume-${input.generationId}`);

				const handle = await tasks.trigger<typeof resumeAgentTask>(
					"resume-agent-task",
					{ generationId: input.generationId, userId },
					{
						concurrencyKey: userId,
						idempotencyKey,
						idempotencyKeyTTL: "24h",
						tags: [`user:${userId}`, `gen:${input.generationId}`],
					}
				);

				context.log?.set({ outcome: "triggered", run: { id: handle.id } });

				return {
					runId: handle.id,
					publicAccessToken: handle.publicAccessToken,
				};
			} catch {
				context.log?.set({ outcome: "trigger_failed" });

				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to trigger agent run",
				});
			}
		}),
};

import { ORPCError } from "@orpc/server";
import { generations } from "@stackk-career/db/schema/generations";
import { messages } from "@stackk-career/db/schema/messages";
import { resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import {
	createGenerationInputSchema,
	getGenerationInputSchema,
	getResumeAnalysisInputSchema,
} from "@stackk-career/schemas/api/generations";
import { and, count, desc, eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

const MAX_GENERATIONS_PER_USER = 5;
const RESUME_ANALYSIS_OBJECT_TYPE = "resume-analysis";

export const generationsRouter = {
	create: protectedProcedure.input(createGenerationInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "create_generation",
			user: { id: userId },
		});

		const [usage] = await context.db.select({ total: count() }).from(generations).where(eq(generations.owner, userId));

		const total = usage?.total ?? 0;

		context.log?.set({ usage: { total, limit: MAX_GENERATIONS_PER_USER } });

		if (total >= MAX_GENERATIONS_PER_USER) {
			const error = new ORPCError("FORBIDDEN", {
				message: `Generation limit reached (${MAX_GENERATIONS_PER_USER}).`,
			});

			context.log?.set({ outcome: "limit_reached" });

			throw error;
		}

		const [row] = await context.db
			.insert(generations)
			.values({
				...input,
				owner: userId,
			})
			.returning({ id: generations.id });

		if (!row) {
			const error = new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create generation" });
			context.log?.set({ outcome: "insert_failed" });
			context.log?.error(error);
			throw error;
		}

		context.log?.set({
			outcome: "created",
			generation: { id: row.id },
		});

		return row;
	}),

	get: protectedProcedure.input(getGenerationInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_generation",
			user: { id: userId },
			generation: { id: input.id },
		});

		const [row] = await context.db
			.select()
			.from(generations)
			.where(and(eq(generations.id, input.id), eq(generations.owner, userId)))
			.limit(1);

		context.log?.set({
			outcome: row ? "found" : "not_found",
		});

		return row ?? null;
	}),

	getResumeAnalysis: protectedProcedure.input(getResumeAnalysisInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_resume_analysis",
			user: { id: userId },
			generation: { id: input.generationId },
		});

		const [generation] = await context.db
			.select({ id: generations.id })
			.from(generations)
			.where(and(eq(generations.id, input.generationId), eq(generations.owner, userId)))
			.limit(1);

		if (!generation) {
			context.log?.set({ outcome: "generation_not_found" });
			return null;
		}

		const [row] = await context.db
			.select({ object: messages.object })
			.from(messages)
			.where(
				and(
					eq(messages.generationId, input.generationId),
					eq(messages.objectType, RESUME_ANALYSIS_OBJECT_TYPE),
					eq(messages.isAssistant, true)
				)
			)
			.orderBy(desc(messages.createdAt))
			.limit(1);

		if (!row?.object) {
			context.log?.set({ outcome: "not_found" });
			return null;
		}

		const parsed = resumeAnalysisSchema.safeParse(row.object);
		if (!parsed.success) {
			context.log?.set({ outcome: "invalid" });
			return null;
		}

		context.log?.set({ outcome: "found" });
		return parsed.data;
	}),
};

import { ORPCError } from "@orpc/server";
import { generations } from "@stackk-career/db/schema/generations";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

const MAX_GENERATIONS_PER_USER = 5;

export const generationsRouter = {
	create: protectedProcedure
		.input(z.object({ title: z.string().nullable(), summary: z.string().nullable() }))
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "create_generation",
				user: { id: userId },
			});

			const [usage] = await context.db
				.select({ total: count() })
				.from(generations)
				.where(eq(generations.owner, userId));

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

	get: protectedProcedure.input(z.object({ id: z.string().nonempty() })).handler(async ({ input, context }) => {
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
};

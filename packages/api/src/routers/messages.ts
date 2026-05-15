import { ORPCError } from "@orpc/server";
import { generations } from "@stackk-career/db/schema/generations";
import { messages } from "@stackk-career/db/schema/messages";
import { createMessageInputSchema, listMessagesInputSchema } from "@stackk-career/schemas/api/messages";
import { and, asc, eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

export const messagesRouter = {
	create: protectedProcedure.input(createMessageInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "create_message",
			user: { id: userId },
			generation: { id: input.generationId },
			message: {
				isAssistant: input.isAssistant,
				order: input.order,
				textLength: input.text?.length,
			},
		});

		const [generation] = await context.db
			.select({ id: generations.id })
			.from(generations)
			.where(and(eq(generations.id, input.generationId), eq(generations.owner, userId)))
			.limit(1);

		if (!generation) {
			const error = new ORPCError("NOT_FOUND", { message: "Generation not found" });
			context.log?.set({ outcome: "generation_not_found" });
			context.log?.error(error);
			throw error;
		}

		const [row] = await context.db.insert(messages).values(input).returning({ id: messages.id });

		if (!row) {
			const error = new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create message" });
			context.log?.set({ outcome: "insert_failed" });
			context.log?.error(error);
			throw error;
		}

		context.log?.set({
			outcome: "created",
			message: {
				id: row.id,
				isAssistant: input.isAssistant,
				order: input.order,
				textLength: input.text?.length,
			},
		});

		return row;
	}),

	list: protectedProcedure.input(listMessagesInputSchema).handler(async ({ input, context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "list_messages",
			user: { id: userId },
			generation: { id: input.generationId },
		});

		const [generation] = await context.db
			.select({ id: generations.id })
			.from(generations)
			.where(and(eq(generations.id, input.generationId), eq(generations.owner, userId)))
			.limit(1);

		if (!generation) {
			const error = new ORPCError("NOT_FOUND", { message: "Generation not found" });
			context.log?.set({ outcome: "generation_not_found" });
			context.log?.error(error);
			throw error;
		}

		const rows = await context.db
			.select()
			.from(messages)
			.where(eq(messages.generationId, input.generationId))
			.orderBy(asc(messages.order), asc(messages.createdAt))
			.limit(input.limit)
			.offset(input.offset);

		context.log?.set({
			outcome: "listed",
			messages: { count: rows.length, limit: input.limit, offset: input.offset },
		});

		return rows;
	}),
};

import { ORPCError } from "@orpc/server";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import z from "zod";
import { publicProcedure } from "..";

export const filesRelationsRouter = {
	link: publicProcedure
		.input(z.object({ userId: z.string().nonempty(), url: z.string().nonempty(), storageId: z.string().nullable() }))
		.handler(async ({ context, input }) => {
			context.log?.set({
				action: "link_file",
				file: {
					storageId: input.storageId,
					url: input.url,
				},
				user: { id: input.userId },
			});

			const [row] = await context.db.insert(fileMetadata).values(input).returning({ id: fileMetadata.id });

			if (!row) {
				const error = new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to link file" });
				context.log?.set({ outcome: "insert_failed" });
				context.log?.error(error);
				throw error;
			}

			context.log?.set({
				file: {
					id: row.id,
					storageId: input.storageId,
					url: input.url,
				},
				outcome: "linked",
			});

			return row;
		}),
};

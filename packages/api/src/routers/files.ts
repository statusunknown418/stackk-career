import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import z from "zod";
import { publicProcedure } from "..";

export const filesRelationsRouter = {
	link: publicProcedure
		.input(z.object({ userId: z.string().nonempty(), url: z.string().nonempty(), storageId: z.string().nullable() }))
		.handler(({ context, input }) => context.db.insert(fileMetadata).values(input).returning({ id: fileMetadata.id })),
};

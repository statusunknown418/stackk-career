import { call } from "@orpc/server";
import { createContext } from "@stackk-career/api/context";
import { startRequestLog, withRequestLog } from "@stackk-career/api/logging";
import { appRouter } from "@stackk-career/api/routers/index";
import { insertFileMetadataSchema } from "@stackk-career/schemas/db/file-metadata";
import type { FileRouter } from "uploadthing/server";
import { createUploadthing, UploadThingError } from "uploadthing/server";
import { getUser } from "@/functions/get-user";

const f = createUploadthing();

export const uploadRouter = {
	resumeUploader: f({
		pdf: {
			maxFileSize: "4MB",
			maxFileCount: 1,
		},
	})
		.input(insertFileMetadataSchema.pick({ generationId: true }))
		.middleware(async ({ input }) => {
			const user = await getUser();

			if (!user) {
				throw new UploadThingError("Unauthorized");
			}

			return { userId: user.user.id, input };
		})
		.onUploadComplete(({ metadata, file, req }) => {
			const log = startRequestLog({
				request: req,
				method: "POST",
				path: "/api/uploadthing",
			});

			log.set({
				upload: {
					endpoint: "resumeUploader",
					provider: "uploadthing",
				},
			});

			return withRequestLog(log, async () => {
				const insertDb = await call(
					appRouter.filesMetadata.link,
					{
						url: file.ufsUrl,
						userId: metadata.userId,
						storageId: file.customId,
						generationId: metadata.input.generationId,
					},
					{
						context: createContext({
							req,
							log,
						}),
					}
				);

				return {
					uploadedBy: metadata.userId,
					fileUrl: file.ufsUrl,
					storedId: insertDb.id,
					generationId: metadata.input.generationId,
				};
			});
		}),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

import { call } from "@orpc/server";
import { createContext } from "@stackk-career/api/context";
import { appRouter } from "@stackk-career/api/routers/index";
import { createRequestLogger } from "evlog";
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
		.middleware(async () => {
			const user = await getUser();

			if (!user) {
				throw new UploadThingError("Unauthorized");
			}

			return { userId: user.user.id };
		})
		.onUploadComplete(async ({ metadata, file, req }) => {
			const log = createRequestLogger({
				method: "POST",
				path: "/api/uploadthing",
			});

			const [insertDb] = await call(
				appRouter.files.link,
				{ url: file.ufsUrl, userId: metadata.userId, storageId: file.customId },
				{
					context: createContext({
						req,
						log,
					}),
				}
			);

			log.set({
				fileUrl: file.ufsUrl,
				userId: metadata.userId,
				internalFileId: insertDb.id,
			});

			return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl, storedId: insertDb.id };
		}),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

import type { z } from "zod";
import { insertFileMetadataSchema } from "../db/file-metadata";

export const linkFileInputSchema = insertFileMetadataSchema.required({
	storageId: true,
	url: true,
	userId: true,
});

export type LinkFileInput = z.infer<typeof linkFileInputSchema>;

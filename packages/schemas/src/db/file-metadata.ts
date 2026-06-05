import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const selectFileMetadataSchema = createSelectSchema(fileMetadata);
export const insertFileMetadataSchema = createInsertSchema(fileMetadata).strict();
export const updateFileMetadataSchema = createUpdateSchema(fileMetadata);

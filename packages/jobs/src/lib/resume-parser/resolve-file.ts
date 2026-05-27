import type { TriggerDb } from "@stackk-career/db/http";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { and, eq } from "drizzle-orm";
import { assertPdfHostAllowed } from "../utils";

/**
 * Resolve PDF URL from either a direct `fileUrl` or a `fileId` owned by `userId`.
 * Asserts host allowlist either way. The userId check prevents enumeration of
 * other users' files via fileId.
 */
export async function resolveFile(
	db: TriggerDb,
	input: { fileId?: string; fileUrl?: string; userId: string }
): Promise<{ fileId: string | null; pdfUrl: string }> {
	if (input.fileUrl) {
		assertPdfHostAllowed(input.fileUrl);
		return { pdfUrl: input.fileUrl, fileId: null };
	}

	if (!input.fileId) {
		throw new Error("Missing fileId and fileUrl");
	}

	const [row] = await db
		.select()
		.from(fileMetadata)
		.where(and(eq(fileMetadata.id, input.fileId), eq(fileMetadata.userId, input.userId)))
		.limit(1)
		.$withCache();

	if (!row) {
		throw new Error(`File not found or not owned by user: ${input.fileId}`);
	}

	assertPdfHostAllowed(row.url);
	return { pdfUrl: row.url, fileId: row.id };
}

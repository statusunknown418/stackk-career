import type { TriggerDb } from "@stackk-career/db/http";
import { fileMetadata } from "@stackk-career/db/schema/file-metadata";
import { eq } from "drizzle-orm";
import { assertPdfHostAllowed } from "../utils";

/** fileId → fileMetadata.url, OR direct fileUrl. Asserts host allowlist either way. */
export async function resolveFile(
	db: TriggerDb,
	input: { fileId?: string; fileUrl?: string }
): Promise<{ fileId: string | null; pdfUrl: string }> {
	if (input.fileUrl) {
		assertPdfHostAllowed(input.fileUrl);
		return { pdfUrl: input.fileUrl, fileId: null };
	}

	if (!input.fileId) {
		throw new Error("Missing fileId and fileUrl");
	}

	const [row] = await db.select().from(fileMetadata).where(eq(fileMetadata.id, input.fileId)).limit(1).$withCache();

	if (!row) {
		throw new Error(`File not found: ${input.fileId}`);
	}

	assertPdfHostAllowed(row.url);
	return { pdfUrl: row.url, fileId: row.id };
}

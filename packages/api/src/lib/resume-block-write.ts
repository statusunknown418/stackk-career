import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { sanitizeResumeRichTextHtml } from "@stackk-career/schemas/db/resume-blocks";
import { sql } from "drizzle-orm";
import type { Context } from "../context";

type Database = Context["db"];

/**
 * Sanitize a block's HTML-format narrative fields before persistence. Mirrors
 * the write path used by every block mutation so Casey-applied rewrites and
 * user edits are sanitized identically. Non-HTML fields pass through untouched.
 */
export function sanitizeBlockContentForWrite(input: {
	blockType: string;
	content: Record<string, unknown>;
}): Record<string, unknown> {
	const { blockType, content } = input;

	if (blockType === "paragraph" && content.format === "html" && typeof content.text === "string") {
		return { ...content, text: sanitizeResumeRichTextHtml(content.text) };
	}

	if (blockType === "bullet" && content.format === "html" && typeof content.text === "string") {
		return { ...content, text: sanitizeResumeRichTextHtml(content.text) };
	}

	if (blockType === "entry" && content.descriptorFormat === "html" && typeof content.descriptor === "string") {
		return { ...content, descriptor: sanitizeResumeRichTextHtml(content.descriptor) };
	}

	return content;
}

export interface SoftDeleteBlockSubtreeArgs {
	blockId: number;
	resumeId: string;
	userId: string;
}

/**
 * Soft-delete a block and its entire descendant subtree in one statement,
 * scoped to a resume the user owns. Returns the number of rows marked deleted
 * (`0` when the block is already gone, missing, or not owned by the user).
 */
export async function softDeleteBlockSubtree(db: Database, args: SoftDeleteBlockSubtreeArgs): Promise<number> {
	const deletedAt = new Date();
	const result = await db.run(sql`
		WITH RECURSIVE subtree(id) AS (
			SELECT block.id
			FROM ${resumeBlocks} AS block
			INNER JOIN ${resumes} AS resume
				ON resume.id = block.resumeId
			WHERE block.id = ${args.blockId}
				AND block.resumeId = ${args.resumeId}
				AND resume.userId = ${args.userId}
				AND block.deletedAt IS NULL

			UNION ALL

			SELECT child.id
			FROM ${resumeBlocks} AS child
			INNER JOIN subtree
				ON child.parentBlockId = subtree.id
			WHERE child.resumeId = ${args.resumeId}
				AND child.deletedAt IS NULL
		)
		UPDATE ${resumeBlocks}
		SET deletedAt = ${deletedAt}
		WHERE resumeId = ${args.resumeId}
			AND id IN (SELECT id FROM subtree)
	`);

	return result.rowsAffected ?? 0;
}

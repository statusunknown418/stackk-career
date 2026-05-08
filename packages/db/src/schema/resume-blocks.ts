import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { resumes } from "./resumes";

export const BLOCK_TYPES = ["contact", "section", "entry", "bullet", "paragraph", "skill_line", "skill_item"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

interface BlockWithContent {
	blockType: string;
	content: unknown;
}

interface BlockWithId {
	id: number;
}

export const resumeBlocks = sqliteTable(
	"resumeBlocks",
	(t) => ({
		id: t.integer().primaryKey({ autoIncrement: true }),
		resumeId: t
			.text()
			.notNull()
			.references(() => resumes.id, { onDelete: "cascade" }),
		parentBlockId: t.integer(),
		sourceBlockId: t.text(),

		isHidden: t.integer({ mode: "boolean" }).notNull().default(false),
		version: t.integer().notNull().default(1),
		blockType: t.text({ enum: BLOCK_TYPES }).notNull().default("section"),
		position: t.text().notNull(),
		content: t.text({ mode: "json" }).notNull(),

		createdAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: t
			.integer({ mode: "timestamp" })
			.$onUpdateFn(() => new Date())
			.notNull(),
		deletedAt: t.integer({ mode: "timestamp" }),
	}),
	(t) => [
		index("blocks_resumeId_idx").on(t.resumeId),
		index("blocks_parentId_idx").on(t.parentBlockId),
		index("blocks_sourceId_idx").on(t.sourceBlockId),
	]
);

export const resumeBlocksRelations = relations(resumeBlocks, ({ one }) => ({
	resume: one(resumes, {
		fields: [resumeBlocks.resumeId],
		references: [resumes.id],
	}),
	parent: one(resumeBlocks, {
		fields: [resumeBlocks.parentBlockId],
		references: [resumeBlocks.id],
		relationName: "block_children",
	}),
	source: one(resumeBlocks, {
		fields: [resumeBlocks.sourceBlockId],
		references: [resumeBlocks.id],
		relationName: "block_source",
	}),
}));

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const areBlockContentsEqual = (left: unknown, right: unknown): boolean => {
	if (Object.is(left, right)) {
		return true;
	}

	if (Array.isArray(left) && Array.isArray(right)) {
		return left.length === right.length && left.every((value, index) => areBlockContentsEqual(value, right[index]));
	}

	if (isRecord(left) && isRecord(right)) {
		const leftKeys = Object.keys(left);
		const rightKeys = Object.keys(right);

		return (
			leftKeys.length === rightKeys.length &&
			leftKeys.every((key) => Object.hasOwn(right, key) && areBlockContentsEqual(left[key], right[key]))
		);
	}

	return false;
};

export const findBlockById = <T extends BlockWithId>(blocks: T[], blockId: number) =>
	blocks.find((block) => block.id === blockId);

export const hasBlockChanged = <T extends BlockWithContent>(currentBlock: T, savedBlock?: T) =>
	!savedBlock ||
	currentBlock.blockType !== savedBlock.blockType ||
	!areBlockContentsEqual(currentBlock.content, savedBlock.content);

export const replaceBlockById = <T extends BlockWithId>(blocks: T[], next: T) =>
	blocks.map((block) => (block.id === next.id ? next : block));

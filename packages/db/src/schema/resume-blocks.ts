import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { resumes } from "./resumes";

export const BLOCK_TYPES = ["contact", "section", "entry", "bullet", "paragraph", "skill_line", "skill_item"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

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

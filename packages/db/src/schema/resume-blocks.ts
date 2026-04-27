import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
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

		version: t.integer().notNull().default(1),
		blockType: t.text({ enum: BLOCK_TYPES }).notNull().default("section"),
		position: t.text().notNull(),
		content: t.text({ mode: "json" }).$type<BlockPayload[]>().notNull(),

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

export const insertResumeBlocks = createInsertSchema(resumeBlocks);

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

/**
 * ---------------------------------------------------------------------------------------------------
 * 1. CONTENT SCHEMAS
 * ---------------------------------------------------------------------------------------------------
 */

const contactContentSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	items: z
		.array(
			z.object({
				kind: z.enum(["address", "email", "phone", "linkedin", "website", "other"]),
				value: z.string().min(1),
				label: z.string().optional(),
			})
		)
		.min(1),
});

const sectionContentSchema = z.object({
	title: z.string().min(1),
	layout: z.enum(["entries", "skills", "freeform"]).default("entries"),
	isCustom: z.boolean().default(false),
});

const entryContentSchema = z.object({
	title: z.string().min(1),
	subtitle: z.string().optional(),
	location: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().nullable().optional(),
	isCurrent: z.boolean().default(false),
	descriptor: z.string().optional(),
	entryStyle: z.enum(["standard", "condensed", "publication"]).default("standard"),
});

const bulletContentSchema = z.object({
	text: z.string().min(1).max(600),
	metrics: z.array(z.string()).optional(),
	aiSuggested: z.boolean().default(false),
	openingVerb: z.string().optional(),
	originalText: z.string().optional(),
});

const paragraphContentSchema = z.object({
	text: z.string().min(1).max(2000),
	format: z.enum(["plain", "markdown"]).default("plain"),
	aiSuggested: z.boolean().default(false),
	originalText: z.string().optional(),
});

const skillLineContentSchema = z.object({
	label: z.string().min(1),
	category: z.enum(["technical", "languages", "laboratory", "interests", "certifications", "other"]).default("other"),
});

const skillItemContentSchema = z.object({
	value: z.string().min(1),
	proficiency: z
		.enum(["basic", "conversational", "fluent", "native", "beginner", "intermediate", "advanced", "expert"])
		.optional(),
	skillKind: z
		.enum(["language_prog", "framework", "tool", "spoken_lang", "lab_technique", "interest", "certification", "other"])
		.optional(),
});

/**
 * ---------------------------------------------------------------------------------------------------
 * 3. THE DISCRIMINATED UNION
 * ---------------------------------------------------------------------------------------------------
 * `blockType` is the discriminator. TypeScript can narrow `content`
 *  once you check `block.blockType` in a switch or if-statement.
 */
export const blockPayloadSchema = z.discriminatedUnion("blockType", [
	z.object({ blockType: z.literal("contact"), content: contactContentSchema }),
	z.object({ blockType: z.literal("section"), content: sectionContentSchema }),
	z.object({ blockType: z.literal("entry"), content: entryContentSchema }),
	z.object({ blockType: z.literal("bullet"), content: bulletContentSchema }),
	z.object({ blockType: z.literal("paragraph"), content: paragraphContentSchema }),
	z.object({ blockType: z.literal("skill_line"), content: skillLineContentSchema }),
	z.object({ blockType: z.literal("skill_item"), content: skillItemContentSchema }),
]);

/**
 * @description Always go through parseBlock() after reading, createBlock() before writing.
 */
export type BlockPayload = z.infer<typeof blockPayloadSchema>;

/**
 * ---------------------------------------------------------------------------------------------------
 * 4. UTILITY TYPES
 * ---------------------------------------------------------------------------------------------------
 *  Pull the content type for a specific blockType string — used when you
 * want to type a function that only handles one kind of block.
 *
 * @example ContentOf<'bullet'> → { text, metrics, aiSuggested, ... }
 * @example ContentOf<'entry'> → { title, subtitle, location, ... }
 * @example ContentOf<'skill_item'> → { value, proficiency, skillKind }
 */
export type ContentOf<T extends BlockType> = Extract<BlockPayload, { blockType: T }>["content"];

/**
 * ---------------------------------------------------------------------------------------------------
 * 5. THE BLOCK ROW
 * ---------------------------------------------------------------------------------------------------
 * This is what you get back after parsing a DB row through blockPayloadSchema.
 * The meta columns (id, resumeId, position...) are merged with the discriminated
 * payload — so `blockType` and `content` are always in sync at the type level.
 *
 * @implements LexoRank for easier sorting - lexicographically
 */
interface BlockMeta {
	createdAt: Date;
	deletedAt: Date | null;
	id: string;
	parentId: string | null;
	position: string;
	resumeId: string;
	sourceBlockId: string | null; // set when block was copied from another resume
	updatedAt: Date;
	version: number;
}

export type Block = BlockMeta & BlockPayload;

/**
 * ---------------------------------------------------------------------------------------------------
 * 8. PARSE BOUNDARY
 * ---------------------------------------------------------------------------------------------------
 * @description The only place raw DB rows become typed Block objects.
 * @description Call this after every query. Never use raw Drizzle rows outside db/ layer.
 */
const blockRowSchema = z
	.object({
		id: z.string(),
		resumeId: z.string(),
		parentId: z.string().nullable(),
		position: z.string(),
		sourceBlockId: z.string().nullable(),
		deletedAt: z.coerce.date().nullable(),
		version: z.number(),
		createdAt: z.coerce.date(),
		updatedAt: z.coerce.date(),
	})
	.and(blockPayloadSchema);

export type ResumeBlockGenericType = typeof resumeBlocks.$inferSelect;

/**
 * @description use this before rendering or inserting
 * @param raw - `ResumeBlockType`
 * @returns
 */
export function parseBlock(raw: typeof resumeBlocks.$inferSelect): Block {
	const result = blockRowSchema.safeParse(raw);

	if (!result.success) {
		throw new Error(`Invalid block ${raw.id} (${raw.blockType}): ${result.error.message}`);
	}

	return result.data as Block;
}

/**
 * @description MAPS over blocks use this before rendering or inserting
 * @param raw - `ResumeBlockType`
 * @returns
 */
export function mapParseBlocks(raw: (typeof resumeBlocks.$inferSelect)[]): Block[] {
	return raw.map(parseBlock);
}

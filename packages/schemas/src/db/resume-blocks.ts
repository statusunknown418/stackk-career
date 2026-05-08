import { type BLOCK_TYPES, resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";
import { sortLexoPositions } from "../utils/lexographical";

export const selectResumeBlocksSchema = createSelectSchema(resumeBlocks);
export const insertResumeBlocksSchema = createInsertSchema(resumeBlocks);
export const updateResumeBlocksSchema = createUpdateSchema(resumeBlocks);

export type BlockType = (typeof BLOCK_TYPES)[number];

export const contactContentSchema = z.object({
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

export const sectionContentSchema = z.object({
	title: z.string().min(1),
	layout: z.enum(["entries", "skills", "freeform"]).default("entries"),
	isCustom: z.boolean().default(false),
});

export const entryContentSchema = z.object({
	title: z.string().min(1),
	subtitle: z.string().optional(),
	location: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().nullable().optional(),
	isCurrent: z.boolean().default(false),
	descriptor: z.string().optional(),
	entryStyle: z.enum(["standard", "condensed", "publication"]).default("standard"),
});

export const bulletContentSchema = z.object({
	text: z.string().min(1).max(600),
	metrics: z.array(z.string()).optional(),
	aiSuggested: z.boolean().default(false),
	openingVerb: z.string().optional(),
	originalText: z.string().optional(),
});

export const paragraphContentSchema = z.object({
	text: z.string().min(1).max(2000),
	format: z.enum(["plain", "markdown"]).default("plain"),
	aiSuggested: z.boolean().default(false),
	originalText: z.string().optional(),
});

export const skillLineContentSchema = z.object({
	label: z.string().min(1),
	category: z.enum(["technical", "languages", "laboratory", "interests", "certifications", "other"]).default("other"),
});

export const skillItemContentSchema = z.object({
	value: z.string().min(1),
	proficiency: z
		.enum(["basic", "conversational", "fluent", "native", "beginner", "intermediate", "advanced", "expert"])
		.optional(),
	skillKind: z
		.enum(["language_prog", "framework", "tool", "spoken_lang", "lab_technique", "interest", "certification", "other"])
		.optional(),
});

export const blockPayloadSchema = z.discriminatedUnion("blockType", [
	z.object({ blockType: z.literal("contact"), content: contactContentSchema }),
	z.object({ blockType: z.literal("section"), content: sectionContentSchema }),
	z.object({ blockType: z.literal("entry"), content: entryContentSchema }),
	z.object({ blockType: z.literal("bullet"), content: bulletContentSchema }),
	z.object({ blockType: z.literal("paragraph"), content: paragraphContentSchema }),
	z.object({ blockType: z.literal("skill_line"), content: skillLineContentSchema }),
	z.object({ blockType: z.literal("skill_item"), content: skillItemContentSchema }),
]);

export type BlockPayload = z.infer<typeof blockPayloadSchema>;
export type ContentOf<T extends BlockType> = Extract<BlockPayload, { blockType: T }>["content"];

export type ResumeBlockGenericType = typeof resumeBlocks.$inferSelect;
type BlockMeta = Omit<ResumeBlockGenericType, "blockType" | "content">;

export const blockRowSchema = z
	.object(selectResumeBlocksSchema.shape)
	.omit({
		blockType: true,
		content: true,
	})
	.and(blockPayloadSchema);

export type Block = BlockMeta & BlockPayload;

export function parseBlock(raw: typeof resumeBlocks.$inferSelect): Block {
	const result = blockRowSchema.safeParse(raw);

	if (!result.success) {
		throw new Error(`Invalid block ${raw.id} (${raw.blockType}): ${result.error.message}`);
	}

	return result.data as Block;
}

export function mapParseBlocks(raw: (typeof resumeBlocks.$inferSelect)[]): Block[] {
	return raw.map(parseBlock);
}

export type BlockNode = Block & { children: BlockNode[] };

export function buildBlockTree(blocks: ResumeBlockGenericType[]): BlockNode[] {
	const parsedBlocks = sortLexoPositions(mapParseBlocks(blocks), (block) => block.position);
	const nodes = new Map<number, BlockNode>();

	for (const block of parsedBlocks) {
		nodes.set(block.id, {
			...block,
			children: [],
		});
	}

	const roots: BlockNode[] = [];

	for (const block of parsedBlocks) {
		const node = nodes.get(block.id);

		if (!node) {
			continue;
		}

		if (block.parentBlockId === null) {
			roots.push(node);
			continue;
		}

		const parent = nodes.get(block.parentBlockId);

		if (!parent) {
			roots.push(node);
			continue;
		}

		parent.children.push(node);
	}

	return roots;
}

export function formatDateRange(startDate?: string, endDate?: string | null, isCurrent?: boolean): string | null {
	if (!(startDate || endDate || isCurrent)) {
		return null;
	}

	const endLabel = isCurrent ? "Actualidad" : (endDate ?? "");

	if (startDate && endLabel) {
		return `${startDate} - ${endLabel}`;
	}

	return startDate ?? (endLabel || null);
}

const CONTACT_ITEM_LABELS: Record<string, string> = {
	address: "Dirección",
	email: "Email",
	linkedin: "LinkedIn",
	other: "Otro",
	phone: "Teléfono",
	website: "Web",
};

export function getContactItemLabel(kind: string, label?: string): string {
	return label ?? CONTACT_ITEM_LABELS[kind] ?? kind;
}

import { type BLOCK_TYPES, resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";
import { sortLexoPositions } from "../utils/lexographical";

export const selectResumeBlocksSchema = createSelectSchema(resumeBlocks);
export const insertResumeBlocksSchema = createInsertSchema(resumeBlocks);
export const updateResumeBlocksSchema = createUpdateSchema(resumeBlocks);

export type BlockType = (typeof BLOCK_TYPES)[number];

export const contactContentSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	items: z.array(
		z.object({
			kind: z.enum(["address", "email", "phone", "linkedin", "website", "other"]),
			value: z.string(),
			label: z.string().optional(),
		})
	),
});

export const sectionContentSchema = z.object({
	title: z.string(),
	layout: z.enum(["entries", "skills", "freeform"]).default("entries"),
	isCustom: z.boolean().default(false),
});

export const entryContentSchema = z.object({
	title: z.string(),
	subtitle: z.string().optional(),
	location: z.string().optional(),
	isRemote: z.boolean().default(false),
	startDate: z.string().optional(),
	endDate: z.string().nullable().optional(),
	isCurrent: z.boolean().default(false),
	descriptor: z.string().optional(),
	descriptorFormat: z.enum(["plain", "html"]).default("html"),
	entryStyle: z.enum(["standard", "condensed", "publication"]).default("standard"),
});

export const bulletContentSchema = z.object({
	text: z.string().max(600),
	format: z.enum(["plain", "html"]).default("html"),
	metrics: z.array(z.string()).optional(),
	aiSuggested: z.boolean().default(false),
	openingVerb: z.string().optional(),
	originalText: z.string().optional(),
});

export const paragraphContentSchema = z.object({
	text: z.string().max(2000),
	format: z.enum(["plain", "html"]).default("html"),
	aiSuggested: z.boolean().default(false),
	originalText: z.string().optional(),
});

export const skillCategorySchema = z.enum([
	"technical",
	"languages",
	"laboratory",
	"interests",
	"certifications",
	"other",
]);

export const skillProficiencySchema = z.enum([
	"basic",
	"conversational",
	"fluent",
	"native",
	"beginner",
	"intermediate",
	"advanced",
	"expert",
]);

export const skillLineContentSchema = z.object({
	label: z.string(),
	category: skillCategorySchema.default("other"),
});

export const skillItemContentSchema = z.object({
	value: z.string(),
	proficiency: skillProficiencySchema.optional(),
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

interface BlockWithContent {
	blockType: string;
	content: unknown;
}

interface BlockWithId {
	id: number;
}

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
export type SectionBlockNode = Extract<BlockNode, { blockType: "section" }>;
export type EntryBlockNode = Extract<BlockNode, { blockType: "entry" }>;

const allowedResumeHtmlTags = new Set(["p", "ul", "ol", "li", "strong", "em", "b", "i", "br"]);
const scriptTagPattern = /<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const htmlCommentPattern = /<!--[\s\S]*?-->/g;
const htmlTagPattern = /<\/?([a-z0-9-]+)(?:\s[^>]*)?>/gi;
const paragraphBreakPattern = /\n{2,}/;

export const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

export const plainTextToHtml = (value: string): string => {
	const trimmed = value.trim();

	if (!trimmed) {
		return "<p></p>";
	}

	return trimmed
		.split(paragraphBreakPattern)
		.map((chunk) => `<p>${escapeHtml(chunk).replaceAll("\n", "<br>")}</p>`)
		.join("");
};

export const sanitizeResumeRichTextHtml = (value: string): string => {
	const withoutUnsafeBlocks = value.replace(scriptTagPattern, "").replace(htmlCommentPattern, "");

	return withoutUnsafeBlocks.replace(htmlTagPattern, (tag, rawTagName: string) => {
		const tagName = rawTagName.toLowerCase();

		if (!allowedResumeHtmlTags.has(tagName)) {
			return "";
		}

		if (tag.startsWith("</")) {
			return `</${tagName}>`;
		}

		return tagName === "br" ? "<br>" : `<${tagName}>`;
	});
};

export const proseContentToHtml = (value: string | null | undefined, format: "plain" | "html" | undefined): string => {
	const normalizedValue = value ?? "";

	if (format === "html") {
		return sanitizeResumeRichTextHtml(normalizedValue);
	}

	return plainTextToHtml(normalizedValue);
};

interface TimelineSortable {
	content: unknown;
	id: number;
}

const readEntryTimelineFields = (content: unknown) => {
	const parsed = entryContentSchema.safeParse(content);
	if (!parsed.success) {
		return { startDate: undefined, endDate: undefined, isCurrent: false };
	}
	return {
		startDate: parsed.data.startDate,
		endDate: parsed.data.endDate ?? undefined,
		isCurrent: parsed.data.isCurrent,
	};
};

const compareDescString = (a: string | undefined, b: string | undefined): number => {
	if (a === b) {
		return 0;
	}
	if (!a) {
		return 1;
	}
	if (!b) {
		return -1;
	}
	return b.localeCompare(a);
};

const compareTimelinePresence = (
	aFields: ReturnType<typeof readEntryTimelineFields>,
	bFields: ReturnType<typeof readEntryTimelineFields>
): number => {
	if (aFields.isCurrent !== bFields.isCurrent) {
		return aFields.isCurrent ? -1 : 1;
	}

	const aHasStart = Boolean(aFields.startDate);
	const bHasStart = Boolean(bFields.startDate);
	if (aHasStart !== bHasStart) {
		return aHasStart ? 1 : -1;
	}

	if (!(aHasStart || bHasStart)) {
		return 0;
	}

	return compareDescString(aFields.startDate, bFields.startDate);
};

const compareTimelineEndDate = (
	aFields: ReturnType<typeof readEntryTimelineFields>,
	bFields: ReturnType<typeof readEntryTimelineFields>
): number => {
	const aEnd = aFields.isCurrent ? "9999-12" : aFields.endDate;
	const bEnd = bFields.isCurrent ? "9999-12" : bFields.endDate;
	return compareDescString(aEnd, bEnd);
};

const compareTimelineIds = (a: TimelineSortable, b: TimelineSortable): number => {
	const aIsOptimistic = a.id < 0;
	const bIsOptimistic = b.id < 0;
	if (aIsOptimistic !== bIsOptimistic) {
		return aIsOptimistic ? -1 : 1;
	}

	return b.id - a.id;
};

// Sort entries newest-first for timeline-style sections (experience / education).
// Data is the source of truth: isCurrent desc → startDate desc → endDate desc
// (isCurrent treated as "9999-12") → id desc as stable tiebreak (later-created
// row wins). Zero-padded YYYY-MM compares lexicographically. Entries lacking a
// startDate (freshly added rows before the user fills the form) float to the
// top so focus lands on them rather than being yanked to the bottom on each
// keystroke.
export function sortEntriesByTimeline<T extends TimelineSortable>(entries: readonly T[]): T[] {
	return [...entries].sort((a, b) => {
		const aFields = readEntryTimelineFields(a.content);
		const bFields = readEntryTimelineFields(b.content);

		// Neither has a startDate: preserve the caller's order (lexo-asc from
		// `buildBlockTree`). Falling through to the id tiebreak would push
		// optimistic rows (negative ids) below saved rows (positive ids) and
		// the freshly-inserted entry would visibly jump to the bottom.
		const startPresenceCmp = compareTimelinePresence(aFields, bFields);
		if (startPresenceCmp === 0 && !(aFields.startDate || bFields.startDate)) {
			return 0;
		}

		if (startPresenceCmp !== 0) {
			return startPresenceCmp;
		}

		const endCmp = compareTimelineEndDate(aFields, bFields);
		if (endCmp !== 0) {
			return endCmp;
		}

		return compareTimelineIds(a, b);
	});
}

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

export const contactItemKindSchema = contactContentSchema.shape.items.element.shape.kind;
export type ContactItemKind = z.infer<typeof contactItemKindSchema>;
export const CONTACT_ITEM_KINDS = contactItemKindSchema.options;

export const CONTACT_ITEM_LABELS = {
	address: "Dirección",
	email: "Email",
	linkedin: "LinkedIn",
	other: "Otro",
	phone: "Teléfono",
	website: "Web",
} as const satisfies Record<ContactItemKind, string>;

export function getContactItemLabel(kind: ContactItemKind, label?: string): string {
	return label ?? CONTACT_ITEM_LABELS[kind] ?? kind;
}

export type SkillCategory = z.infer<typeof skillCategorySchema>;
export const SKILL_CATEGORIES = skillCategorySchema.options;
export const SKILL_CATEGORY_LABELS = {
	technical: "Técnicas",
	languages: "Idiomas",
	laboratory: "Laboratorio",
	interests: "Intereses",
	certifications: "Certificaciones",
	other: "Otro",
} as const satisfies Record<SkillCategory, string>;

export type SkillProficiency = z.infer<typeof skillProficiencySchema>;
export const SKILL_PROFICIENCIES = skillProficiencySchema.options;
export const SKILL_PROFICIENCY_LABELS = {
	basic: "Básico",
	conversational: "Conversacional",
	fluent: "Fluido",
	native: "Nativo",
	beginner: "Principiante",
	intermediate: "Intermedio",
	advanced: "Avanzado",
	expert: "Experto",
} as const satisfies Record<SkillProficiency, string>;

export const buildLabeledOptions = <K extends string>(
	values: readonly K[],
	labels: Record<K, string>
): readonly { label: string; value: K }[] => values.map((value) => ({ value, label: labels[value] }));

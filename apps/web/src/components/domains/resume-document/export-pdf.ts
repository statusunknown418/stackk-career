import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import { getSectionKind, isTimelineSectionKind } from "@stackk-career/schemas/api/resumes";
import type { BlockNode, EntryBlockNode, SectionBlockNode } from "@stackk-career/schemas/db/resume-blocks";
import {
	proseContentToHtml,
	SKILL_PROFICIENCY_LABELS,
	sortEntriesByTimeline,
} from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";

type ContactBlockNode = Extract<BlockNode, { blockType: "contact" }>;
type SkillLineNode = Extract<BlockNode, { blockType: "skill_line" }>;
type SkillItemNode = Extract<BlockNode, { blockType: "skill_item" }>;
type BulletNode = Extract<BlockNode, { blockType: "bullet" }>;
type ParagraphNode = Extract<BlockNode, { blockType: "paragraph" }>;

type RgbColor = readonly [number, number, number];

/** A4 portrait geometry, in millimetres. */
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const PAGE_CENTER = PAGE_WIDTH / 2;
const PT_TO_MM = 0.352_777_78;
const BODY_SIZE = 9.5;

/**
 * Always-light palette mirroring the app's light theme tokens: foreground is
 * neutral-800, muted-foreground the neutral-500/black blend, separators a
 * print-legible neutral-300 (the live 6% rule is invisible on paper).
 */
const INK: RgbColor = [38, 38, 38];
const MUTED: RgbColor = [103, 103, 103];
const RULE: RgbColor = [212, 212, 212];

const WORK_SETTING_LABELS = {
	onsite: "Presencial",
	hybrid: "Híbrido",
	remote: "Remoto",
} as const;

const STORED_DATE_FORMAT = "yyyy-MM";
const FILENAME_INVALID_CHARS = /[^\p{L}\p{N}\-_. ]+/gu;
const COLLAPSIBLE_SPACES = /[ \t]+/g;
const REPEATED_NEWLINES = /\n{2,}/g;

const isEntry = (block: BlockNode): block is EntryBlockNode => block.blockType === "entry";
const isBullet = (block: BlockNode): block is BulletNode => block.blockType === "bullet";
const isParagraph = (block: BlockNode): block is ParagraphNode => block.blockType === "paragraph";
const isSkillLine = (block: BlockNode): block is SkillLineNode => block.blockType === "skill_line";
const isSkillItem = (block: BlockNode): block is SkillItemNode => block.blockType === "skill_item";

const byPosition = <T extends { position: string }>(items: readonly T[]): T[] =>
	sortLexoPositions(items, (item) => item.position);

const capitalize = (value: string): string => (value ? value[0]?.toUpperCase() + value.slice(1) : value);

/** Parse a stored `yyyy-MM` value into the same `Mmm yyyy` label the editor shows. */
const formatMonth = (value: string | null | undefined): string | null => {
	if (!value) {
		return null;
	}
	const parsed = parse(value, STORED_DATE_FORMAT, new Date());
	return Number.isNaN(parsed.getTime()) ? null : capitalize(format(parsed, "MMM yyyy", { locale: es }));
};

const formatEntryDates = (content: EntryBlockNode["content"]): string | null => {
	const start = formatMonth(content.startDate);
	const end = content.isCurrent ? "Actualidad" : formatMonth(content.endDate);
	if (start && end) {
		return `${start} – ${end}`;
	}
	return start ?? end ?? null;
};

const buildEntryMeta = (content: EntryBlockNode["content"], kind: SectionKind): string => {
	const parts: string[] = [];
	const isExperience = kind === "experience";
	const workSetting = content.workSetting ?? (content.isRemote ? "remote" : "onsite");
	const showLocation = !isExperience || workSetting !== "remote";

	if (showLocation && content.location?.trim()) {
		parts.push(content.location.trim());
	}
	if (isExperience) {
		parts.push(WORK_SETTING_LABELS[workSetting]);
	}
	const dates = formatEntryDates(content);
	if (dates) {
		parts.push(dates);
	}
	return parts.join("  ·  ");
};

interface RichSegment {
	items?: string[];
	kind: "paragraph" | "list";
	ordered?: boolean;
	text?: string;
}

/** Collect text from a node, turning `<br>` into newlines. */
const collectText = (node: Node): string => {
	let out = "";
	for (const child of Array.from(node.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			out += child.textContent ?? "";
		} else if (child.nodeType === Node.ELEMENT_NODE) {
			const element = child as Element;
			out += element.tagName === "BR" ? "\n" : collectText(element);
		}
	}
	return out;
};

const normalizeText = (value: string): string =>
	value
		.split("\n")
		.map((line) => line.replace(COLLAPSIBLE_SPACES, " ").trim())
		.join("\n")
		.replace(REPEATED_NEWLINES, "\n")
		.trim();

const listItems = (list: Element): string[] =>
	Array.from(list.children)
		.filter((child) => child.tagName === "LI")
		.map((item) => normalizeText(collectText(item)))
		.filter((text) => text.length > 0);

const segmentFromElement = (element: Element): RichSegment | null => {
	if (element.tagName === "UL" || element.tagName === "OL") {
		const items = listItems(element);
		return items.length ? { kind: "list", ordered: element.tagName === "OL", items } : null;
	}
	const text = normalizeText(collectText(element));
	return text ? { kind: "paragraph", text } : null;
};

/** Turn sanitized resume rich text into ordered paragraph / list segments. */
const parseRichText = (value: string | null | undefined, formatHint: "plain" | "html" | undefined): RichSegment[] => {
	const html = proseContentToHtml(value, formatHint);
	const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
	const segments: RichSegment[] = [];

	for (const node of Array.from(parsed.body.childNodes)) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = normalizeText(node.textContent ?? "");
			if (text) {
				segments.push({ kind: "paragraph", text });
			}
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const segment = segmentFromElement(node as Element);
			if (segment) {
				segments.push(segment);
			}
		}
	}
	return segments;
};

/** Flatten rich text to a single plain line (used for a bullet block's own prose). */
const richTextToPlain = (value: string | null | undefined, formatHint: "plain" | "html" | undefined): string =>
	parseRichText(value, formatHint)
		.map((segment) => (segment.kind === "list" ? (segment.items ?? []).join(" ") : (segment.text ?? "")))
		.filter((text) => text.length > 0)
		.join(" ")
		.trim();

const sanitizeFilename = (value: string): string => {
	const cleaned = value.replace(FILENAME_INVALID_CHARS, " ").replace(/\s+/g, " ").trim();
	return cleaned || "CV";
};

const lineHeight = (size: number, factor = 1.3): number => size * factor * PT_TO_MM;

/** Mutable drawing cursor shared across the render helpers. */
interface PdfContext {
	doc: jsPDF;
	fontSize: number;
	y: number;
}

const applyFont = (
	ctx: PdfContext,
	family: "helvetica" | "times",
	style: "normal" | "bold" | "italic",
	size: number,
	color: RgbColor
): void => {
	ctx.doc.setFont(family, style);
	ctx.doc.setFontSize(size);
	ctx.doc.setTextColor(color[0], color[1], color[2]);
	ctx.fontSize = size;
};

const ensureSpace = (ctx: PdfContext, height: number): void => {
	if (ctx.y + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
		ctx.doc.addPage();
		ctx.y = MARGIN_TOP;
	}
};

interface WrapOptions {
	align?: "left" | "center";
	factor?: number;
	maxWidth?: number;
	x?: number;
}

const drawWrapped = (ctx: PdfContext, text: string, options: WrapOptions = {}): void => {
	const { x = MARGIN_X, maxWidth = CONTENT_WIDTH, align = "left", factor = 1.3 } = options;
	const height = lineHeight(ctx.fontSize, factor);
	for (const line of ctx.doc.splitTextToSize(text, maxWidth) as string[]) {
		ensureSpace(ctx, height);
		ctx.doc.text(line, x, ctx.y, { align, baseline: "top" });
		ctx.y += height;
	}
};

const MARKER_WIDTH = 4.5;

const drawMarkerBlock = (ctx: PdfContext, text: string, marker: string, factor = 1.35): void => {
	const height = lineHeight(ctx.fontSize, factor);
	const lines = ctx.doc.splitTextToSize(text, CONTENT_WIDTH - MARKER_WIDTH) as string[];
	lines.forEach((line, index) => {
		ensureSpace(ctx, height);
		if (index === 0) {
			ctx.doc.text(marker, MARGIN_X + 0.5, ctx.y, { baseline: "top" });
		}
		ctx.doc.text(line, MARGIN_X + MARKER_WIDTH, ctx.y, { baseline: "top" });
		ctx.y += height;
	});
};

const drawRichText = (
	ctx: PdfContext,
	value: string | null | undefined,
	formatHint: "plain" | "html" | undefined
): void => {
	for (const segment of parseRichText(value, formatHint)) {
		if (segment.kind === "paragraph" && segment.text) {
			applyFont(ctx, "helvetica", "normal", BODY_SIZE, INK);
			drawWrapped(ctx, segment.text);
			ctx.y += 1;
		} else if (segment.kind === "list" && segment.items) {
			applyFont(ctx, "helvetica", "normal", BODY_SIZE, INK);
			segment.items.forEach((item, index) => {
				drawMarkerBlock(ctx, item, segment.ordered ? `${index + 1}.` : "•");
				ctx.y += 0.6;
			});
			ctx.y += 0.6;
		}
	}
};

const drawLabeledLine = (ctx: PdfContext, label: string, body: string): void => {
	const height = lineHeight(BODY_SIZE, 1.35);
	const labelText = label.trim() ? `${label.trim()}: ` : "";
	applyFont(ctx, "helvetica", "bold", BODY_SIZE, INK);
	const labelWidth = labelText ? ctx.doc.getTextWidth(labelText) : 0;
	const inlineFits = labelWidth > 0 && labelWidth < CONTENT_WIDTH * 0.5;

	if (labelText && !inlineFits) {
		drawWrapped(ctx, labelText.trimEnd());
	}

	const indent = inlineFits ? labelWidth : 0;
	applyFont(ctx, "helvetica", "normal", BODY_SIZE, INK);
	const lines = ctx.doc.splitTextToSize(body, CONTENT_WIDTH - indent) as string[];
	lines.forEach((line, index) => {
		ensureSpace(ctx, height);
		if (index === 0 && labelText && inlineFits) {
			applyFont(ctx, "helvetica", "bold", BODY_SIZE, INK);
			ctx.doc.text(labelText, MARGIN_X, ctx.y, { baseline: "top" });
			applyFont(ctx, "helvetica", "normal", BODY_SIZE, INK);
		}
		ctx.doc.text(line, MARGIN_X + indent, ctx.y, { baseline: "top" });
		ctx.y += height;
	});
};

const drawContact = (ctx: PdfContext, block: ContactBlockNode): void => {
	const fullName = `${block.content.firstName} ${block.content.lastName}`.trim();
	if (fullName) {
		applyFont(ctx, "times", "bold", 22, INK);
		drawWrapped(ctx, fullName.toUpperCase(), { x: PAGE_CENTER, align: "center", factor: 1.15 });
	}

	const items = block.content.items.map((item) => item.value.trim()).filter((value) => value.length > 0);
	if (items.length) {
		ctx.y += 1.5;
		applyFont(ctx, "helvetica", "normal", BODY_SIZE, MUTED);
		drawWrapped(ctx, items.join("    |    "), { x: PAGE_CENTER, align: "center" });
	}
	ctx.y += 5;
};

const drawEntryHeader = (ctx: PdfContext, content: EntryBlockNode["content"], kind: SectionKind): void => {
	if (content.title.trim()) {
		applyFont(ctx, "helvetica", "bold", 10.5, INK);
		drawWrapped(ctx, content.title.trim(), { factor: 1.2 });
	}
	if (content.subtitle?.trim()) {
		applyFont(ctx, "helvetica", "normal", 10, INK);
		drawWrapped(ctx, content.subtitle.trim(), { factor: 1.2 });
	}
	const meta = buildEntryMeta(content, kind);
	if (meta) {
		ctx.y += 0.5;
		applyFont(ctx, "helvetica", "normal", 8.5, MUTED);
		drawWrapped(ctx, meta);
	}
};

const drawBullets = (ctx: PdfContext, bullets: BulletNode[]): void => {
	if (!bullets.length) {
		return;
	}
	ctx.y += 1;
	applyFont(ctx, "helvetica", "normal", BODY_SIZE, INK);
	for (const bullet of bullets) {
		const text = richTextToPlain(bullet.content.text, bullet.content.format);
		if (text) {
			drawMarkerBlock(ctx, text, "•");
			ctx.y += 0.6;
		}
	}
};

const drawEntry = (ctx: PdfContext, entry: EntryBlockNode, kind: SectionKind): void => {
	ctx.y += 3;
	drawEntryHeader(ctx, entry.content, kind);
	if (entry.content.descriptor?.trim()) {
		ctx.y += 1.5;
		drawRichText(ctx, entry.content.descriptor, entry.content.descriptorFormat);
	}

	const children = byPosition(entry.children);
	drawBullets(ctx, children.filter(isBullet));
	for (const paragraph of children.filter(isParagraph)) {
		ctx.y += 1;
		drawRichText(ctx, paragraph.content.text, paragraph.content.format);
	}
};

const drawSkillLine = (ctx: PdfContext, line: SkillLineNode, fallbackLabel: string): void => {
	const items = byPosition(line.children.filter(isSkillItem));
	const body = items
		.map((item) => {
			const proficiency = item.content.proficiency ? ` (${SKILL_PROFICIENCY_LABELS[item.content.proficiency]})` : "";
			return `${item.content.value.trim()}${proficiency}`;
		})
		.filter((value) => value.trim().length > 0)
		.join(", ");
	if (!body) {
		return;
	}
	ctx.y += 2;
	drawLabeledLine(ctx, line.content.label.trim() || fallbackLabel, body);
};

const drawSkillsLayout = (ctx: PdfContext, section: SectionBlockNode, kind: SectionKind): void => {
	const lines = byPosition(section.children.filter(isSkillLine));
	if (kind === "languages") {
		const primary = lines[0];
		if (primary) {
			drawSkillLine(ctx, primary, "Idiomas");
		}
		return;
	}
	for (const line of lines) {
		drawSkillLine(ctx, line, "");
	}
};

const drawEntriesLayout = (ctx: PdfContext, section: SectionBlockNode, kind: SectionKind): void => {
	const rawEntries = section.children.filter(isEntry);
	const entries = isTimelineSectionKind(kind) ? sortEntriesByTimeline(rawEntries) : byPosition(rawEntries);
	for (const entry of entries) {
		drawEntry(ctx, entry, kind);
	}
};

const drawSectionHeading = (ctx: PdfContext, title: string): void => {
	ctx.y += 5;
	applyFont(ctx, "helvetica", "bold", 12, INK);
	drawWrapped(ctx, title, { factor: 1.15 });
	ctx.y += 1;
	ensureSpace(ctx, 2);
	ctx.doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
	ctx.doc.setLineWidth(0.3);
	ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_WIDTH, ctx.y);
	ctx.y += 2.5;
};

const drawSection = (ctx: PdfContext, section: SectionBlockNode): void => {
	drawSectionHeading(ctx, section.content.title);
	const kind = getSectionKind(section.content);

	if (section.content.layout === "skills") {
		drawSkillsLayout(ctx, section, kind);
		return;
	}
	if (section.content.layout === "freeform") {
		for (const paragraph of byPosition(section.children).filter(isParagraph)) {
			ctx.y += 1.5;
			drawRichText(ctx, paragraph.content.text, paragraph.content.format);
		}
		return;
	}
	drawEntriesLayout(ctx, section, kind);
};

interface ExportResumeArgs {
	rootBlocks: BlockNode[];
	title: string;
}

/**
 * Render a resume's block tree to a downloadable PDF using jsPDF's text API
 * (selectable text, true light mode), mirroring the on-screen document layout.
 */
export function exportResumeToPdf({ rootBlocks, title }: ExportResumeArgs): void {
	const ctx: PdfContext = {
		doc: new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" }),
		fontSize: 10,
		y: MARGIN_TOP,
	};

	const contactBlock = rootBlocks.find((block) => block.blockType === "contact");
	if (contactBlock?.blockType === "contact") {
		drawContact(ctx, contactBlock);
	}

	for (const block of rootBlocks) {
		if (block.blockType === "section") {
			drawSection(ctx, block);
		}
	}

	ctx.doc.save(`${sanitizeFilename(title)}.pdf`);
}

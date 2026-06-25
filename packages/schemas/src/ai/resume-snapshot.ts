import { getSectionKind, isExperienceLikeSectionKind, type SectionKind } from "../api/resumes";
import type { BlockNode, BlockType } from "../db/resume-blocks";
import type { JobPosting } from "../jobs/linkedin-job-fetch";

/**
 * A single searchable text field on a resume block. The edit-candidate
 * validator uses these to prove an edit's `before` substring really exists and
 * to ground evidence quotes; the snapshot derives facts from their values.
 */
export interface SnapshotTextField {
	blockId: number;
	blockType: BlockType;
	/** Field name within the block content (e.g. "text", "descriptor", "title"). */
	fieldPath: string;
	value: string;
}

/** One experience-like entry, flattened with the facts the rubric cares about. */
export interface SnapshotEntry {
	blockId: number;
	bulletCount: number;
	/** At least one bullet/paragraph child OR a non-empty descriptor. */
	hasContent: boolean;
	/** End date present OR the entry is marked current. */
	hasEndDate: boolean;
	hasStartDate: boolean;
	/** Kind of the section this entry belongs to (experience, education, …). */
	sectionKind: SectionKind;
	sectionTitle: string;
	subtitle?: string;
	title: string;
}

/**
 * Job-target facts relevant to deterministic keyword scoring. Built from a
 * fetched posting; absent when the resume has no ready target job.
 */
export interface SnapshotJobTarget {
	company: string | null;
	/** Lowercased, deduplicated skills + ATS keywords the posting asks for. */
	keywords: string[];
	title: string | null;
}

/**
 * Structured resume facts derived ONCE from the block tree so neither the model
 * nor downstream deterministic modules re-discover them from raw JSON. Quality
 * gates, the score ceiling, and the edit validator all read from this.
 */
export interface ResumeSnapshot {
	/** Every block id present in the resume (including contact); for existence checks. */
	blockIds: number[];
	contactBlockId: number | null;
	/** Groups of entry blockIds that share the same title + subtitle. */
	duplicateEntryGroups: number[][];
	/** Experience-like entry blockIds with no bullets/paragraphs and no descriptor. */
	entriesMissingBullets: number[];
	/** Experience-like entry blockIds missing a start or end date (and not current). */
	entriesMissingDates: number[];
	entryCount: number;
	/** Experience-like entries with at least one bullet/paragraph or a descriptor. */
	experienceEntryCount: number;
	/** All non-contact field values joined; used for verbatim substring checks. */
	flatText: string;
	hasContact: boolean;
	hasJobTarget: boolean;
	/** A number, percentage, or currency amount appears in experience-like entry content. */
	hasMeasurableAchievement: boolean;
	jobTarget: SnapshotJobTarget | null;
	/** Posting keywords NOT found anywhere in the resume text. */
	missingJobKeywords: string[];
	/** Block ids whose text contains placeholders or meta-commentary / non-resume content. */
	placeholderBlockIds: number[];
	textFields: SnapshotTextField[];
	/** Word count across all non-contact text fields (HTML stripped). */
	wordCountExcludingContact: number;
}

// --- Text scanning --------------------------------------------------------
// These feed deterministic scoring and the edit validator, so they live in code
// (not the model): the score must be reproducible, and the validator must police
// the model's own output. "word char" = ASCII [A-Za-z0-9_], matching the intent
// of the regexes this replaced.

const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= "0" && ch <= "9";
const isSpace = (ch: string | undefined): boolean => ch !== undefined && ch.trim() === "";
const isWordChar = (ch: string | undefined): boolean =>
	ch !== undefined && (isDigit(ch) || ch === "_" || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"));

/** Strip HTML tags to spaces. Resume rich text is sanitized HTML, so any "<" opens a tag. */
const stripHtml = (value: string): string => {
	const out: string[] = [];
	let inTag = false;
	for (const ch of value) {
		if (ch === "<") {
			inTag = true;
		} else if (ch === ">") {
			inTag = false;
			out.push(" ");
		} else if (!inTag) {
			out.push(ch);
		}
	}
	return out.join("");
};

/** Count whitespace-separated words after stripping HTML. */
const countWords = (value: string): number => {
	let count = 0;
	let inWord = false;
	for (const ch of stripHtml(value)) {
		if (ch.trim() === "") {
			inWord = false;
		} else if (!inWord) {
			count += 1;
			inWord = true;
		}
	}
	return count;
};

/** Whether the number whose digit run starts at index `i` is a real magnitude. */
function digitRunIsMeasurable(value: string, i: number): boolean {
	let intEnd = i;
	while (isDigit(value[intEnd])) {
		intEnd += 1;
	}
	const integerDigits = intEnd - i;
	// Optionally extend over one "." or "," group: 30 · 1,200 · 2.5
	let end = intEnd;
	if ((value[end] === "." || value[end] === ",") && isDigit(value[end + 1])) {
		end += 1;
		while (isDigit(value[end])) {
			end += 1;
		}
	}
	let after = end;
	while (isSpace(value[after])) {
		after += 1;
	}
	if (value[after] === "%") {
		return true; // 30% · 2.5 %
	}
	if (isWordChar(value[i - 1])) {
		return false; // number embedded in a word (covid19) — not an achievement
	}
	const suffix = value[after];
	const isMultiplier =
		suffix === "k" || suffix === "K" || suffix === "m" || suffix === "M" || suffix === "x" || suffix === "X";
	if (isMultiplier && !isWordChar(value[after + 1])) {
		return true; // 5k · 10x · 2M
	}
	// A plain 2+ digit number, but only when it ends a word (not "10M1", "covid19").
	return integerDigits >= 2 && !isWordChar(value[intEnd]);
}

/**
 * True when `value` contains a real quantified magnitude: a percentage, a
 * currency amount, a 2+ digit number, or a k/m/x multiplier. Numbers glued to a
 * word (e.g. "covid19", "html5") are ignored — they aren't achievements.
 */
function hasMeasurableMagnitude(value: string): boolean {
	for (let i = 0; i < value.length; i += 1) {
		const ch = value[i];
		// $2M / € 5 — currency then an optional single space then a digit.
		if (ch === "$" || ch === "€" || ch === "£") {
			if (isDigit(isSpace(value[i + 1]) ? value[i + 2] : value[i + 1])) {
				return true;
			}
			continue;
		}
		if (isDigit(ch) && !isDigit(value[i - 1]) && digitRunIsMeasurable(value, i)) {
			return true;
		}
	}
	return false;
}

/**
 * True when `needle` occurs in `text` with a word boundary on the requested
 * sides — `before` guards "footnote:"/"max%", `after` guards "todos"/"as an aim".
 */
function hasToken(text: string, needle: string, sides: { before?: boolean; after?: boolean } = {}): boolean {
	for (let from = text.indexOf(needle); from !== -1; from = text.indexOf(needle, from + 1)) {
		const beforeOk = !sides.before || from === 0 || !isWordChar(text[from - 1]);
		const afterOk = !(sides.after && isWordChar(text[from + needle.length]));
		if (beforeOk && afterOk) {
			return true;
		}
	}
	return false;
}

/** `<your …>` / `<tu …>` fill-in tags. `text` is already lowercased. */
function hasFillInTag(text: string): boolean {
	for (const open of ["<your", "<tu"]) {
		for (let from = text.indexOf(open); from !== -1; from = text.indexOf(open, from + 1)) {
			const after = from + open.length;
			if (!isWordChar(text[after]) && text.indexOf(">", after) !== -1) {
				return true;
			}
		}
	}
	return false;
}

/** "n/a %" / "na %" placeholder. `text` is already lowercased. */
function hasNotApplicablePercent(text: string): boolean {
	for (const token of ["n/a", "na"]) {
		for (let from = text.indexOf(token); from !== -1; from = text.indexOf(token, from + 1)) {
			let p = from + token.length;
			if ((from === 0 || !isWordChar(text[from - 1])) && !isWordChar(text[p])) {
				while (text[p] === " ") {
					p += 1;
				}
				if (text[p] === "%") {
					return true;
				}
			}
		}
	}
	return false;
}

/** Placeholders/fill-ins that must never survive into a finished resume. `text` lowercased. */
const PLACEHOLDER_TOKENS = [
	"[number]",
	"[metric]",
	"[tu métrica]",
	"[tu metrica]",
	"[cantidad]",
	"[porcentaje]",
	"[fecha]",
	"[valor]",
	"___",
];
/** Model meta-commentary (incl. both separators of "chain of thought"). `text` lowercased. */
const META_PHRASES = [
	"i will omit",
	"i will remove",
	"i will skip",
	"omitted due to",
	"as per instruction",
	"as per the instruction",
	"chain-of-thought",
	"chain of thought",
	"chain-of thought",
	"chain of-thought",
];

/** True when text carries a placeholder/fill-in token or model meta-commentary — never apply such text to a resume. */
export function containsResumePlaceholder(value: string): boolean {
	const text = value.toLowerCase();
	if (
		PLACEHOLDER_TOKENS.some((token) => text.includes(token)) ||
		META_PHRASES.some((phrase) => text.includes(phrase))
	) {
		return true;
	}
	if (hasFillInTag(text) || hasNotApplicablePercent(text)) {
		return true;
	}
	return (
		hasToken(text, "tbd", { before: true, after: true }) ||
		hasToken(text, "todo", { before: true, after: true }) ||
		hasToken(text, "as an ai", { before: true, after: true }) ||
		hasToken(text, "x%", { before: true }) ||
		hasToken(text, "y%", { before: true }) ||
		hasToken(text, "z%", { before: true }) ||
		hasToken(text, "note:", { before: true }) ||
		hasToken(text, "wait,", { before: true })
	);
}

/** Push a non-empty searchable field onto the accumulator. */
const pushField = (
	fields: SnapshotTextField[],
	block: BlockNode,
	fieldPath: string,
	value: string | null | undefined
): void => {
	if (typeof value === "string" && value.trim().length > 0) {
		fields.push({ blockId: block.id, blockType: block.blockType, fieldPath, value });
	}
};

/** Collect every searchable text field on a block (contact excluded by the caller). */
function collectBlockFields(block: BlockNode, fields: SnapshotTextField[]): void {
	switch (block.blockType) {
		case "section":
			pushField(fields, block, "title", block.content.title);
			break;
		case "entry":
			pushField(fields, block, "title", block.content.title);
			pushField(fields, block, "subtitle", block.content.subtitle);
			pushField(fields, block, "descriptor", block.content.descriptor);
			break;
		case "bullet":
			pushField(fields, block, "text", block.content.text);
			break;
		case "paragraph":
			pushField(fields, block, "text", block.content.text);
			break;
		case "skill_line":
			pushField(fields, block, "label", block.content.label);
			break;
		case "skill_item":
			pushField(fields, block, "value", block.content.value);
			break;
		default:
			break;
	}
}

/** Count direct bullet/paragraph children with real content and join their text. */
function collectEntryContent(entry: BlockNode): { bulletCount: number; childText: string } {
	let bulletCount = 0;
	const parts: string[] = [];
	for (const child of entry.children) {
		if ((child.blockType === "bullet" || child.blockType === "paragraph") && child.content.text.trim().length > 0) {
			bulletCount += 1;
			parts.push(child.content.text);
		}
	}
	return { bulletCount, childText: parts.join("\n") };
}

/**
 * Normalize a fetched posting into the keyword facts deterministic keyword
 * scoring needs. Exported so the trigger task can build it from a loaded job
 * target without leaking posting shape into the snapshot builder.
 */
export function buildSnapshotJobTarget(
	posting: JobPosting | null,
	title: string | null,
	company: string | null
): SnapshotJobTarget {
	const keywords = new Set<string>();
	for (const value of [...(posting?.skills ?? []), ...(posting?.keywords ?? [])]) {
		const normalized = value.trim().toLowerCase();
		if (normalized.length > 0) {
			keywords.add(normalized);
		}
	}
	return { title, company, keywords: [...keywords] };
}

export interface BuildResumeSnapshotOptions {
	jobTarget?: SnapshotJobTarget | null;
}

interface SnapshotAccumulator {
	blockIds: number[];
	contactBlockId: number | null;
	entries: SnapshotEntry[];
	entryKeyToIds: Map<string, number[]>;
	/** Concatenated content text of experience-like entries; feeds measurable-achievement detection. */
	experienceContentText: string[];
	hasContact: boolean;
	textFields: SnapshotTextField[];
}

/** Record contact presence; contact text is intentionally excluded from snapshot facts. */
function recordContact(block: Extract<BlockNode, { blockType: "contact" }>, acc: SnapshotAccumulator): void {
	const filled =
		block.content.firstName.trim().length > 0 ||
		block.content.lastName.trim().length > 0 ||
		block.content.items.some((item) => item.value.trim().length > 0);
	if (filled) {
		acc.hasContact = true;
		acc.contactBlockId = block.id;
	}
}

/** Flatten one entry's structural facts (kind, dates, content) and track it for duplicate detection. */
function recordEntry(
	block: Extract<BlockNode, { blockType: "entry" }>,
	sectionKind: SectionKind,
	sectionTitle: string,
	acc: SnapshotAccumulator
): void {
	const { bulletCount, childText } = collectEntryContent(block);
	const descriptor = (block.content.descriptor ?? "").trim();
	const hasContent = bulletCount > 0 || descriptor.length > 0;
	const hasStartDate = (block.content.startDate ?? "").trim().length > 0;
	const hasEndDate = (block.content.endDate ?? "").trim().length > 0 || block.content.isCurrent === true;

	acc.entries.push({
		blockId: block.id,
		sectionKind,
		sectionTitle,
		title: block.content.title,
		subtitle: block.content.subtitle,
		hasStartDate,
		hasEndDate,
		bulletCount,
		hasContent,
	});

	if (isExperienceLikeSectionKind(sectionKind)) {
		const contentText = [descriptor, childText].filter((part) => part.length > 0).join("\n");
		if (contentText.length > 0) {
			acc.experienceContentText.push(contentText);
		}
	}

	const key = `${block.content.title.trim().toLowerCase()}\u0000${(block.content.subtitle ?? "").trim().toLowerCase()}`;
	const ids = acc.entryKeyToIds.get(key) ?? [];
	ids.push(block.id);
	acc.entryKeyToIds.set(key, ids);
}

/**
 * Derive structured resume facts from the block tree. Pure and deterministic so
 * the same resume always yields the same snapshot; the model never sees raw
 * JSON-only facts it would otherwise have to re-derive each run.
 */
export function buildResumeSnapshot(roots: BlockNode[], options: BuildResumeSnapshotOptions = {}): ResumeSnapshot {
	const jobTarget = options.jobTarget ?? null;
	const acc: SnapshotAccumulator = {
		blockIds: [],
		contactBlockId: null,
		entries: [],
		entryKeyToIds: new Map<string, number[]>(),
		experienceContentText: [],
		hasContact: false,
		textFields: [],
	};

	const visit = (block: BlockNode, sectionTitle: string, sectionKind: SectionKind): void => {
		acc.blockIds.push(block.id);
		if (block.blockType === "contact") {
			recordContact(block, acc);
			return;
		}
		collectBlockFields(block, acc.textFields);
		if (block.blockType === "entry") {
			recordEntry(block, sectionKind, sectionTitle, acc);
		}
		const nextSectionTitle = block.blockType === "section" ? block.content.title : sectionTitle;
		const nextSectionKind = block.blockType === "section" ? getSectionKind(block.content) : sectionKind;
		for (const child of block.children) {
			visit(child, nextSectionTitle, nextSectionKind);
		}
	};

	for (const root of roots) {
		visit(root, "", "custom");
	}

	const placeholderBlockIds: number[] = [];
	for (const field of acc.textFields) {
		if (containsResumePlaceholder(field.value)) {
			placeholderBlockIds.push(field.blockId);
		}
	}

	const duplicateEntryGroups: number[][] = [];
	for (const ids of acc.entryKeyToIds.values()) {
		if (ids.length > 1) {
			duplicateEntryGroups.push(ids);
		}
	}

	// Structural experience gates only consider experience-like sections (work,
	// projects, volunteering). Education, certifications, skills, etc. have
	// different expectations and must not trip "experience" blockers.
	const experienceEntries = acc.entries.filter((entry) => isExperienceLikeSectionKind(entry.sectionKind));
	const experienceEntryCount = experienceEntries.filter((entry) => entry.hasContent).length;
	const entriesMissingBullets = experienceEntries.filter((entry) => !entry.hasContent).map((entry) => entry.blockId);
	const entriesMissingDates = experienceEntries
		.filter((entry) => !(entry.hasStartDate && entry.hasEndDate))
		.map((entry) => entry.blockId);

	const flatText = acc.textFields.map((field) => field.value).join("\n");
	const wordCountExcludingContact = acc.textFields.reduce((total, field) => total + countWords(field.value), 0);
	const hasMeasurableAchievement = hasMeasurableMagnitude(stripHtml(acc.experienceContentText.join("\n")));

	const flatTextLower = flatText.toLowerCase();
	const missingJobKeywords = jobTarget ? jobTarget.keywords.filter((keyword) => !flatTextLower.includes(keyword)) : [];

	return {
		hasContact: acc.hasContact,
		contactBlockId: acc.contactBlockId,
		blockIds: acc.blockIds,
		entryCount: acc.entries.length,
		experienceEntryCount,
		entriesMissingBullets,
		entriesMissingDates,
		duplicateEntryGroups,
		hasMeasurableAchievement,
		placeholderBlockIds: [...new Set(placeholderBlockIds)],
		wordCountExcludingContact,
		textFields: acc.textFields,
		flatText,
		hasJobTarget: jobTarget !== null,
		jobTarget,
		missingJobKeywords,
	};
}

/**
 * Compact, model-facing projection of the snapshot. Excludes the full text body
 * (the model already receives the block tree) and keeps only the facts Casey
 * needs to avoid re-deriving structure and to target the right blocks.
 */
export function summarizeResumeSnapshotForPrompt(snapshot: ResumeSnapshot): Record<string, unknown> {
	return {
		hasContact: snapshot.hasContact,
		entryCount: snapshot.entryCount,
		experienceEntryCount: snapshot.experienceEntryCount,
		entriesMissingBullets: snapshot.entriesMissingBullets,
		entriesMissingDates: snapshot.entriesMissingDates,
		duplicateEntryGroups: snapshot.duplicateEntryGroups,
		hasMeasurableAchievement: snapshot.hasMeasurableAchievement,
		placeholderBlockIds: snapshot.placeholderBlockIds,
		wordCountExcludingContact: snapshot.wordCountExcludingContact,
		hasJobTarget: snapshot.hasJobTarget,
		jobTargetRole: snapshot.jobTarget
			? [snapshot.jobTarget.title, snapshot.jobTarget.company].filter(Boolean).join(" @ ") || null
			: null,
		missingJobKeywords: snapshot.missingJobKeywords,
	};
}

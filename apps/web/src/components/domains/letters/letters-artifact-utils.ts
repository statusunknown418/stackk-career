import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { DeepPartial } from "ai";
import { jsPDF } from "jspdf";

export const EMPTY_SECTION_MESSAGE = "Ninguna sección puede quedar vacía.";

// A letter section is either plain text (what CASEY writes) or TipTap HTML (after a manual
// edit — the editor persists getHTML()). TipTap always emits block-wrapped markup, so the
// first character tells them apart without parsing.
const isTipTapHtml = (value: string): boolean =>
	value.startsWith("<p") || value.startsWith("<ul") || value.startsWith("<ol");

const escapeHtml = (value: string): string =>
	value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Plain text (paragraphs split by blank lines) → `<p>…</p>` HTML for the editor. */
export function bodyToHtml(value: string): string {
	if (isTipTapHtml(value)) {
		return value;
	}
	return value
		.split("\n\n")
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
		.join("");
}

/**
 * Editor HTML → plain text. DOM-based (DOMParser), so it must only run inside event
 * handlers (copy / download / save) — never during render, which also runs on the server.
 */
function htmlToText(value: string): string {
	if (!isTipTapHtml(value)) {
		return value;
	}
	const doc = new DOMParser().parseFromString(value, "text/html");
	for (const br of doc.body.querySelectorAll("br")) {
		br.replaceWith("\n");
	}
	const blocks = doc.body.querySelectorAll("p, li");
	if (blocks.length === 0) {
		return (doc.body.textContent ?? "").trim();
	}
	return Array.from(blocks, (block) => (block.textContent ?? "").trim())
		.filter(Boolean)
		.join("\n\n");
}

/** Narrows a (possibly streaming) artifact to a complete 4-section letter, or null. */
export function toCompleteCoverLetter(artifact: DeepPartial<CoverLetter> | undefined): CoverLetter | null {
	if (!artifact) {
		return null;
	}
	const { greeting, body, closing, signature } = artifact;
	if (
		typeof greeting !== "string" ||
		typeof body !== "string" ||
		typeof closing !== "string" ||
		typeof signature !== "string"
	) {
		return null;
	}
	return { greeting, body, closing, signature };
}

/**
 * Build and download the letter PDF, paginating line by line (jsPDF doesn't paginate
 * inside a single text() call, so paragraphs taller than a page would get clipped).
 */
export function downloadCoverLetterPdf(letter: CoverLetter) {
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const pageHeight = 297;
	const margin = 25;
	const contentWidth = 210 - margin * 2;
	const lineHeight = 5;
	const maxY = pageHeight - margin;

	doc.setFontSize(11);
	let cursorY = margin;

	const splitToLines = (value: string): string[] => {
		const lines = doc.splitTextToSize(value, contentWidth);
		return Array.isArray(lines) ? lines : [lines];
	};
	const writeBlock = (value: string, gapAfter: number) => {
		for (const line of splitToLines(value)) {
			if (cursorY + lineHeight > maxY) {
				doc.addPage();
				cursorY = margin;
			}
			doc.text(line, margin, cursorY);
			cursorY += lineHeight;
		}
		cursorY += gapAfter;
	};

	doc.setFont("helvetica", "bold");
	writeBlock(htmlToText(letter.greeting), 8);

	doc.setFont("helvetica", "normal");
	for (const p of htmlToText(letter.body).split("\n\n")) {
		const trimmed = p.trim();
		if (trimmed) {
			writeBlock(trimmed, 6);
		}
	}

	cursorY += 4;
	writeBlock(htmlToText(letter.closing), 8);

	doc.setFont("helvetica", "bold");
	writeBlock(htmlToText(letter.signature), 0);

	doc.save("carta-de-presentacion.pdf");
}

/**
 * Serialize the letter to plain text for the clipboard. Returns null when a section is
 * missing or empty after stripping markup. Handler-only (uses the DOM, see htmlToText).
 */
export function formatCoverLetterAsText(artifact: DeepPartial<CoverLetter> | undefined): string | null {
	const letter = toCompleteCoverLetter(artifact);
	if (!letter) {
		return null;
	}
	const sections = [letter.greeting, letter.body, letter.closing, letter.signature].map(htmlToText);
	if (sections.some((section) => !section.trim())) {
		return null;
	}
	return `${sections.join("\n\n")}\n`;
}

/** A letter is saveable when all four sections have real content (same bar as Copy). */
export const allSectionsFilled = (letter: CoverLetter): boolean => formatCoverLetterAsText(letter) !== null;

import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { DeepPartial } from "ai";
import { jsPDF } from "jspdf";

export const EMPTY_SECTION_MESSAGE = "Ninguna sección puede quedar vacía.";

// Letter sections are plain text end to end: CASEY emits plain text and the inline editor
// saves plain text, so there is a single canonical format — no HTML, no conversions.

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
	writeBlock(letter.greeting, 8);

	doc.setFont("helvetica", "normal");
	for (const p of letter.body.split("\n\n")) {
		const trimmed = p.trim();
		if (trimmed) {
			writeBlock(trimmed, 6);
		}
	}

	cursorY += 4;
	writeBlock(letter.closing, 8);

	doc.setFont("helvetica", "bold");
	writeBlock(letter.signature, 0);

	doc.save("carta-de-presentacion.pdf");
}

/**
 * Serialize the letter to plain text for the clipboard. Returns null when a section is
 * missing (still streaming) or empty.
 */
export function formatCoverLetterAsText(artifact: DeepPartial<CoverLetter> | undefined): string | null {
	const letter = toCompleteCoverLetter(artifact);
	if (!letter) {
		return null;
	}
	const sections = [letter.greeting, letter.body, letter.closing, letter.signature];
	if (sections.some((section) => !section.trim())) {
		return null;
	}
	return `${sections.join("\n\n")}\n`;
}

/** A letter is saveable when all four sections have real content (same bar as Copy). */
export const allSectionsFilled = (letter: CoverLetter): boolean => formatCoverLetterAsText(letter) !== null;

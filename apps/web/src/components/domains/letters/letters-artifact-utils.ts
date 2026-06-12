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
	return {
		...artifact,
		greeting,
		body,
		closing,
		signature,
	} as CoverLetter;
}

/**
 * Build and download the letter PDF, paginating line by line, styled according to the
 * selected visual template (centered, classic, minty, blue).
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PDF generation template orchestration has high complexity
export function downloadCoverLetterPdf(
	letter: CoverLetter,
	template?: "centered" | "classic" | "minty" | "blue" | null,
	userName?: string,
	userEmail?: string
) {
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const pageHeight = 297;
	const margin = 25;

	// Resolve candidate contact details
	const name = letter.contactName || userName || "Tu Nombre";
	const email = letter.contactEmail || userEmail || "tu.email@example.com";
	const phone = letter.contactPhone || "+51 999 999 999";
	const linkedin = letter.contactLinkedin || "linkedin.com/in/candidato";
	const title = letter.contactTitle || "";
	const address = letter.contactAddress || "";
	const website = letter.contactWebsite || "";

	// Resolve recipient details
	const recipientName = letter.recipientName || "";
	const recipientCompany = letter.recipientCompany || "";
	const recipientAddress = letter.recipientAddress || "";

	// Resolve date
	const todayDateStr = letter.dateStr || new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date());

	let cursorY = margin;
	let contentWidth = 210 - margin * 2;
	let startX = margin;

	const writeBlockAtX = (
		value: string,
		x: number,
		currentContentWidth: number,
		gapAfter: number,
		align: "left" | "center" | "right" = "left"
	) => {
		const lines = doc.splitTextToSize(value, currentContentWidth);
		const lineList = Array.isArray(lines) ? lines : [lines];
		const lineHeight = 5;
		const maxY = pageHeight - margin;

		for (const line of lineList) {
			if (cursorY + lineHeight > maxY) {
				doc.addPage();
				cursorY = margin;
			}
			if (align === "center") {
				doc.text(line, x + currentContentWidth / 2, cursorY, { align: "center" });
			} else if (align === "right") {
				doc.text(line, x + currentContentWidth, cursorY, { align: "right" });
			} else {
				doc.text(line, x, cursorY);
			}
			cursorY += lineHeight;
		}
		cursorY += gapAfter;
	};

	// Helper to print Recipient Block
	const writeRecipientBlock = (align: "left" | "right" = "left") => {
		if (!(recipientName || recipientCompany || recipientAddress)) {
			return;
		}
		doc.setFont("helvetica", "bold");
		doc.setFontSize(9.5);
		doc.setTextColor(50, 50, 50);
		if (recipientName) {
			writeBlockAtX(recipientName, startX, contentWidth, 1, align);
		}
		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.setTextColor(80, 80, 80);
		if (recipientCompany) {
			writeBlockAtX(recipientCompany, startX, contentWidth, 1, align);
		}
		if (recipientAddress) {
			writeBlockAtX(recipientAddress, startX, contentWidth, 1, align);
		}
		cursorY += 2;
	};

	if (template === "centered") {
		// --- Centered Header ---
		doc.setFont("helvetica", "bold");
		doc.setFontSize(18);
		doc.setTextColor(30, 30, 30);
		doc.text(name, 105, cursorY, { align: "center" });
		cursorY += 6;

		if (title) {
			doc.setFont("helvetica", "normal");
			doc.setFontSize(10);
			doc.setTextColor(100, 100, 100);
			doc.text(title, 105, cursorY, { align: "center" });
			cursorY += 5;
		}

		doc.setFont("helvetica", "normal");
		doc.setFontSize(8.5);
		doc.setTextColor(120, 120, 120);
		const contactParts = [email, phone, linkedin];
		if (address) {
			contactParts.push(address);
		}
		if (website) {
			contactParts.push(website);
		}
		doc.text(contactParts.join("   |   "), 105, cursorY, { align: "center" });
		cursorY += 5;

		doc.setDrawColor(220, 220, 220);
		doc.setLineWidth(0.3);
		doc.line(margin, cursorY, 210 - margin, cursorY);
		cursorY += 8;

		// Date (right aligned)
		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.setTextColor(120, 120, 120);
		doc.text(todayDateStr, 210 - margin, cursorY, { align: "right" });
		cursorY += 4;

		// Recipient (left aligned)
		writeRecipientBlock("left");
		cursorY += 4;

		doc.setTextColor(40, 40, 40);
		doc.setFontSize(11);
	} else if (template === "classic") {
		// --- Classic Header ---
		doc.setFont("helvetica", "bold");
		doc.setFontSize(20);
		doc.setTextColor(30, 30, 30);
		doc.text(name, margin, cursorY);
		cursorY += 7;

		if (title) {
			doc.setFont("helvetica", "normal");
			doc.setFontSize(10.5);
			doc.setTextColor(100, 100, 100);
			doc.text(title, margin, cursorY);
			cursorY += 5;
		}

		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.setTextColor(100, 100, 100);
		const contactParts = [email, phone, linkedin];
		if (address) {
			contactParts.push(address);
		}
		if (website) {
			contactParts.push(website);
		}
		doc.text(contactParts.join("   ·   "), margin, cursorY);
		cursorY += 4;

		doc.setDrawColor(200, 200, 200);
		doc.setLineWidth(0.5);
		doc.line(margin, cursorY, 210 - margin, cursorY);
		cursorY += 8;

		// Date (right aligned)
		doc.setFontSize(9);
		doc.setTextColor(120, 120, 120);
		doc.text(todayDateStr, 210 - margin, cursorY, { align: "right" });
		cursorY += 4;

		// Recipient (left aligned)
		writeRecipientBlock("left");
		cursorY += 4;

		doc.setTextColor(40, 40, 40);
		doc.setFontSize(11);
	} else if (template === "minty") {
		// --- Minty Header Banner ---
		doc.setFillColor(235, 247, 240);
		doc.rect(0, 0, 210, 45, "F");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(20);
		doc.setTextColor(16, 120, 75);
		doc.text(name, margin, 20);

		if (title) {
			doc.setFont("helvetica", "normal");
			doc.setFontSize(10);
			doc.setTextColor(60, 140, 100);
			doc.text(title, margin, 26);
		}

		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.setTextColor(60, 140, 100);
		doc.text("CARTA DE PRESENTACIÓN", 210 - margin, 20, { align: "right" });

		cursorY = 55;
		startX = 70;
		contentWidth = 210 - margin - startX;

		let leftY = cursorY;
		doc.setFont("helvetica", "bold");
		doc.setFontSize(9);
		doc.setTextColor(16, 120, 75);
		doc.text("CONTACTO", margin, leftY);
		leftY += 6;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(80, 80, 80);

		doc.text("Email:", margin, leftY);
		leftY += 4;
		doc.text(email, margin, leftY);
		leftY += 6;

		doc.text("Teléfono:", margin, leftY);
		leftY += 4;
		doc.text(phone, margin, leftY);
		leftY += 6;

		doc.text("LinkedIn:", margin, leftY);
		leftY += 4;
		doc.text(linkedin, margin, leftY);
		leftY += 6;

		if (address) {
			doc.text("Dirección:", margin, leftY);
			leftY += 4;
			doc.text(address, margin, leftY);
			leftY += 6;
		}

		if (website) {
			doc.text("Web:", margin, leftY);
			leftY += 4;
			doc.text(website, margin, leftY);
			leftY += 8;
		}

		doc.setFont("helvetica", "bold");
		doc.setFontSize(9);
		doc.setTextColor(16, 120, 75);
		doc.text("FECHA", margin, leftY);
		leftY += 6;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(80, 80, 80);
		doc.text(todayDateStr, margin, leftY);

		// Print recipient at start of content on the right column
		writeRecipientBlock("left");
		cursorY = Math.max(cursorY, leftY);

		doc.setTextColor(40, 40, 40);
		doc.setFontSize(10.5);
	} else if (template === "blue") {
		// --- Blue Header ---
		doc.setFont("helvetica", "bold");
		doc.setFontSize(22);
		doc.setTextColor(30, 100, 200);
		doc.text(name, 105, cursorY, { align: "center" });
		cursorY += 7;

		if (title) {
			doc.setFont("helvetica", "normal");
			doc.setFontSize(11);
			doc.setTextColor(100, 100, 100);
			doc.text(title, 105, cursorY, { align: "center" });
			cursorY += 5;
		}

		doc.setFont("helvetica", "normal");
		doc.setFontSize(9.5);
		doc.setTextColor(100, 100, 100);
		doc.text("CARTA DE PRESENTACIÓN", 105, cursorY, { align: "center" });
		cursorY += 6;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(8.5);
		doc.setTextColor(120, 120, 120);
		const contactParts = [email, phone, linkedin];
		if (address) {
			contactParts.push(address);
		}
		if (website) {
			contactParts.push(website);
		}
		doc.text(contactParts.join("   |   "), 105, cursorY, { align: "center" });
		cursorY += 4;

		doc.setDrawColor(30, 100, 200);
		doc.setLineWidth(1);
		doc.line(margin, cursorY, 210 - margin, cursorY);
		cursorY += 10;

		// Date (right aligned)
		doc.setFontSize(9);
		doc.setTextColor(120, 120, 120);
		doc.text(todayDateStr, 210 - margin, cursorY, { align: "right" });
		cursorY += 4;

		// Recipient (left aligned)
		writeRecipientBlock("left");
		cursorY += 4;

		doc.setTextColor(40, 40, 40);
		doc.setFontSize(11);
	} else {
		// Default
		doc.setFont("helvetica", "normal");
		doc.setFontSize(11);
	}

	doc.setFont(doc.getFont().fontName, "bold");
	writeBlockAtX(htmlToText(letter.greeting), startX, contentWidth, 8);

	doc.setFont(doc.getFont().fontName, "normal");
	for (const p of htmlToText(letter.body).split("\n\n")) {
		const trimmed = p.trim();
		if (trimmed) {
			writeBlockAtX(trimmed, startX, contentWidth, 6);
		}
	}

	cursorY += 4;
	writeBlockAtX(htmlToText(letter.closing), startX, contentWidth, 8);

	if (template === "centered") {
		doc.setFont(doc.getFont().fontName, "normal");
		writeBlockAtX("Atentamente,", startX, contentWidth, 4, "center");
		doc.setFont(doc.getFont().fontName, "bold");
		writeBlockAtX(htmlToText(letter.signature), startX, contentWidth, 0, "center");
	} else if (template === "blue") {
		doc.setFont(doc.getFont().fontName, "bold");
		doc.setTextColor(30, 100, 200);
		writeBlockAtX("Atentamente,", startX, contentWidth, 4);
		doc.setTextColor(40, 40, 40);
		writeBlockAtX(htmlToText(letter.signature), startX, contentWidth, 0);
	} else if (template === "minty") {
		doc.setFont(doc.getFont().fontName, "bold");
		doc.setTextColor(16, 120, 75);
		writeBlockAtX("Atentamente,", startX, contentWidth, 4);
		doc.setTextColor(40, 40, 40);
		writeBlockAtX(htmlToText(letter.signature), startX, contentWidth, 0);
	} else {
		doc.setFont(doc.getFont().fontName, "bold");
		writeBlockAtX(htmlToText(letter.signature), startX, contentWidth, 0);
	}

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

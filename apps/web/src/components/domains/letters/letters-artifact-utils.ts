import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterTemplate, CoverLetterTemplateName } from "@stackk-career/schemas/api/letters";
import { normalizeTemplate } from "@stackk-career/schemas/api/letters";
import type { DeepPartial } from "ai";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { type LetterAccent, TEMPLATE_ACCENTS } from "./letter-accents";

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

type Rgb = readonly [number, number, number];

interface LetterheadParams {
	accent: Rgb;
	buildContacts: (sep: string) => string;
	doc: jsPDF;
	faint: Rgb;
	family: string;
	margin: number;
	muted: Rgb;
	name: string;
	startY: number;
	t: CoverLetterTemplateName;
	title: string;
	tplAccent: LetterAccent | undefined;
}

/** Creative letterhead: a full-width brand-color band with the name reversed out. */
function drawBandHead(params: LetterheadParams, tpl: LetterAccent): number {
	const { buildContacts, doc, family, margin, muted, name, title } = params;
	const bandHeight = title ? 30 : 24;
	doc.setFillColor(tpl.pdfFill[0], tpl.pdfFill[1], tpl.pdfFill[2]);
	doc.rect(0, 0, 210, bandHeight, "F");
	doc.setTextColor(tpl.pdfInk[0], tpl.pdfInk[1], tpl.pdfInk[2]);
	doc.setFont(family, "bold");
	doc.setFontSize(20);
	doc.text(name, margin, 15);
	if (title) {
		doc.setFont(family, "normal");
		doc.setFontSize(10);
		doc.text(title.toUpperCase(), margin, 22);
	}
	let cursorY = bandHeight + 6;
	doc.setFont(family, "normal");
	doc.setFontSize(9);
	doc.setTextColor(muted[0], muted[1], muted[2]);
	doc.text(buildContacts("   ·   "), margin, cursorY);
	cursorY += 8;
	return cursorY;
}

/** Vibrant letterhead: a colored monogram tile of the candidate's initials beside the name. */
function drawMonogramHead(params: LetterheadParams, tpl: LetterAccent): number {
	const { accent, buildContacts, doc, family, margin, muted, name, startY, title } = params;
	const initials =
		name
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0]?.toUpperCase() ?? "")
			.join("") || "·";
	const tileSize = 14;
	const tileTop = startY - 5;
	const textX = margin + tileSize + 5;
	let cursorY = startY;

	doc.setFillColor(tpl.pdfFill[0], tpl.pdfFill[1], tpl.pdfFill[2]);
	doc.roundedRect(margin, tileTop, tileSize, tileSize, 2.5, 2.5, "F");
	doc.setTextColor(tpl.pdfInk[0], tpl.pdfInk[1], tpl.pdfInk[2]);
	doc.setFont(family, "bold");
	doc.setFontSize(11);
	doc.text(initials, margin + tileSize / 2, tileTop + tileSize / 2 + 2, { align: "center" });

	doc.setFont(family, "bold");
	doc.setFontSize(18);
	doc.setTextColor(accent[0], accent[1], accent[2]);
	doc.text(name, textX, cursorY);
	cursorY += 6;

	if (title) {
		doc.setFont(family, "normal");
		doc.setFontSize(9.5);
		doc.setTextColor(tpl.pdfText[0], tpl.pdfText[1], tpl.pdfText[2]);
		doc.text(title.toUpperCase(), textX, cursorY);
		cursorY += 5;
	}

	cursorY = Math.max(cursorY, tileTop + tileSize + 5);
	doc.setFont(family, "normal");
	doc.setFontSize(9);
	doc.setTextColor(muted[0], muted[1], muted[2]);
	doc.text(buildContacts("   ·   "), margin, cursorY);
	cursorY += 8;
	return cursorY;
}

/** Draws the template-specific letterhead starting at `startY`; returns the cursor Y below it. */
function drawLetterhead(params: LetterheadParams): number {
	const { accent, buildContacts, doc, faint, family, margin, muted, name, startY, t, title, tplAccent } = params;
	if (t === "creative" && tplAccent) {
		return drawBandHead(params, tplAccent);
	}
	if (t === "vibrant" && tplAccent) {
		return drawMonogramHead(params, tplAccent);
	}
	let cursorY = startY;
	if (t === "editorial") {
		doc.setFont(family, "bold");
		doc.setFontSize(22);
		doc.setTextColor(...accent);
		doc.text(name, 105, cursorY, { align: "center" });
		cursorY += 8;

		if (title) {
			doc.setFont(family, "normal");
			doc.setFontSize(9.5);
			doc.setTextColor(...muted);
			doc.text(title.toUpperCase(), 105, cursorY, { align: "center" });
			cursorY += 5;
		}

		doc.setFont(family, "normal");
		doc.setFontSize(9);
		doc.setTextColor(...faint);
		doc.text(buildContacts("   |   "), 105, cursorY, { align: "center" });
		cursorY += 5;

		doc.setDrawColor(210, 210, 210);
		doc.setLineWidth(0.3);
		doc.line(95, cursorY, 115, cursorY);
		cursorY += 8;
	} else {
		doc.setFont(family, "bold");
		doc.setFontSize(20);
		doc.setTextColor(...accent);
		doc.text(name, margin, cursorY);
		cursorY += 7;

		if (title) {
			doc.setFont(family, "normal");
			doc.setFontSize(10);
			doc.setTextColor(...muted);
			doc.text(t === "modern" ? title.toUpperCase() : title, margin, cursorY);
			cursorY += 5;
		}

		doc.setFont(family, "normal");
		doc.setFontSize(9);
		doc.setTextColor(...muted);
		doc.text(buildContacts("   ·   "), margin, cursorY);
		cursorY += 4;

		doc.setDrawColor(205, 205, 205);
		if (t === "modern") {
			doc.setLineWidth(0.6);
			doc.line(margin, cursorY, margin + 18, cursorY);
		} else {
			doc.setLineWidth(0.4);
			doc.line(margin, cursorY, 210 - margin, cursorY);
		}
		cursorY += 8;
	}
	return cursorY;
}

/**
 * Build and download the letter PDF, paginating line by line, styled to match the selected
 * typography template: `standard` and `modern` use a left-aligned sans letterhead, `editorial`
 * a centered serif one. Print output stays on white paper with neutral ink.
 */
export function downloadCoverLetterPdf(
	letter: CoverLetter,
	template?: CoverLetterTemplate,
	userName?: string,
	userEmail?: string
) {
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const pageHeight = 297;
	const margin = 25;

	const getVal = (val: string | null | undefined, fallbackVal = "") => val || fallbackVal;

	// Resolve candidate contact details
	const name = getVal(letter.contactName, userName || "Tu Nombre");
	const email = getVal(letter.contactEmail, userEmail || "tu.email@example.com");
	const phone = getVal(letter.contactPhone, "+51 999 999 999");
	const linkedin = getVal(letter.contactLinkedin, "linkedin.com/in/candidato");
	const title = getVal(letter.contactTitle);
	const address = getVal(letter.contactAddress);
	const website = getVal(letter.contactWebsite);

	// Resolve recipient details
	const recipientName = getVal(letter.recipientName);
	const recipientCompany = getVal(letter.recipientCompany);
	const recipientAddress = getVal(letter.recipientAddress);

	// Resolve date
	const todayDateStr = letter.dateStr || format(new Date(), "PPP", { locale: es });
	const t = normalizeTemplate(template);
	const tplAccent = TEMPLATE_ACCENTS[t];
	const family = t === "editorial" ? "times" : "helvetica";
	const centered = t === "editorial";
	const buildContacts = (sep: string) => [email, phone, linkedin, address, website].filter(Boolean).join(sep);

	let cursorY = margin;
	const contentWidth = 210 - margin * 2;
	const startX = margin;

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

	const accent: [number, number, number] = [40, 40, 40];
	const muted: [number, number, number] = [110, 110, 110];
	const faint: [number, number, number] = [150, 150, 150];

	cursorY = drawLetterhead({
		accent,
		buildContacts,
		doc,
		faint,
		family,
		margin,
		muted,
		name,
		startY: cursorY,
		t,
		title,
		tplAccent,
	});

	doc.setFont(family, "normal");
	doc.setFontSize(9);
	doc.setTextColor(...faint);
	doc.text(todayDateStr, 210 - margin, cursorY, { align: "right" });
	cursorY += 4;

	writeRecipientBlock("left");
	cursorY += 4;

	doc.setTextColor(...accent);
	doc.setFontSize(11);

	doc.setFont(family, "bold");
	writeBlockAtX(htmlToText(letter.greeting), startX, contentWidth, 8);

	doc.setFont(family, "normal");
	for (const p of htmlToText(letter.body).split("\n\n")) {
		const trimmed = p.trim();
		if (trimmed) {
			writeBlockAtX(trimmed, startX, contentWidth, 6);
		}
	}

	cursorY += 4;
	writeBlockAtX(htmlToText(letter.closing), startX, contentWidth, 8);

	doc.setFont(family, "bold");
	if (tplAccent) {
		doc.setTextColor(tplAccent.pdfText[0], tplAccent.pdfText[1], tplAccent.pdfText[2]);
	} else {
		doc.setTextColor(...accent);
	}
	writeBlockAtX(htmlToText(letter.signature), startX, contentWidth, 0, centered ? "center" : "left");

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

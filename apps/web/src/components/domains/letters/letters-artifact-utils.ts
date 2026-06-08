import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { DeepPartial } from "ai";
import { jsPDF } from "jspdf";

export const EMPTY_SECTION_MESSAGE = "Ninguna sección puede quedar vacía.";

// El cuerpo de la carta puede venir como texto plano (lo que escribe CASEY) o como
// HTML (cuando el usuario lo editó con el editor enriquecido TipTap). Estos helpers
// normalizan en ambos sentidos — el schema sigue siendo un único `string`.
// Detecta SOLO los tags que el editor TipTap (StarterKit prose) emite — no cualquier `<token>`.
// Así un texto plano como `Promise<T>`, `<empresa>` o `<a@b.com>` NO se confunde con HTML: se
// escapa bien y no se pierde al renderizar / copiar / exportar a PDF.
const HTML_TAG_RE = /<\/?(?:p|br|strong|em|ul|ol|li)(?:>|\s|\/)/i;
const BR_RE = /<br\s*\/?>/gi;
const BLOCK_CLOSE_RE = /<\/(?:p|div|li)>/gi;
const ANY_TAG_RE = /<[^>]+>/g;
const MULTI_NEWLINE_RE = /\n{3,}/g;
const PARAGRAPH_SPLIT_RE = /\n{2,}/;

const isHtmlBody = (value: string): boolean => HTML_TAG_RE.test(value);

const escapeHtml = (value: string): string =>
	value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Texto plano (párrafos separados por `\n\n`) → HTML `<p>…</p>`. Si ya es HTML, lo deja igual. */
export function bodyToHtml(value: string): string {
	if (isHtmlBody(value)) {
		return value;
	}
	return value
		.split(PARAGRAPH_SPLIT_RE)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
		.join("");
}

/** HTML del editor → texto plano (para PDF / copiar / validar vacío). Si ya es plano, lo deja igual. */
function htmlToText(value: string): string {
	if (!isHtmlBody(value)) {
		return value;
	}
	return value
		.replace(BR_RE, "\n")
		.replace(BLOCK_CLOSE_RE, "\n\n")
		.replace(ANY_TAG_RE, "")
		.replaceAll("&nbsp;", " ")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&")
		.replace(MULTI_NEWLINE_RE, "\n\n")
		.trim();
}

/** Extrae el artifact completo (4 secciones string) para editar, o null si está incompleto. */
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
 * Genera y descarga el PDF de la carta, paginando LÍNEA por línea (jsPDF no pagina dentro de
 * un solo text(), así que escribir el párrafo entero recortaba párrafos más altos que la página).
 * A nivel de módulo para mantener baja la complejidad cognitiva del componente.
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

export const allSectionsFilled = (letter: CoverLetter): boolean =>
	Boolean(
		htmlToText(letter.greeting).trim() &&
			htmlToText(letter.body).trim() &&
			htmlToText(letter.closing).trim() &&
			htmlToText(letter.signature).trim()
	);

/**
 * Serialize the (possibly partial) cover letter to plain text for the clipboard Copy
 * button. Returns null si alguna sección falta o todavía es un chunk incompleto — el
 * caller usa eso para deshabilitar Copy/Download mientras streamea. (El Download genera
 * un PDF con jsPDF a partir del mismo artifact, no un .txt.)
 */
export function formatCoverLetterAsText(artifact: DeepPartial<CoverLetter> | undefined): string | null {
	if (!artifact) {
		return null;
	}
	const { greeting, body, closing, signature } = artifact;
	if (typeof greeting !== "string" || !greeting) {
		return null;
	}
	if (typeof body !== "string" || !body) {
		return null;
	}
	if (typeof closing !== "string" || !closing) {
		return null;
	}
	if (typeof signature !== "string" || !signature) {
		return null;
	}
	return `${htmlToText(greeting)}\n\n${htmlToText(body)}\n\n${htmlToText(closing)}\n\n${htmlToText(signature)}\n`;
}

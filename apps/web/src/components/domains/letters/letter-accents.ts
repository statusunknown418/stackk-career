import type { CoverLetterTemplateName } from "@stackk-career/schemas/api/letters";

/**
 * Accent palette for the *playful* cover-letter templates (`creative`, `vibrant`).
 *
 * Hues stay inside the ASSENDIA family: `creative` wears the brand green (≈ hue 142),
 * `vibrant` a warm amber counterpoint. Each is a mid-tone, saturated color that keeps
 * legible contrast on both the light and the dark letter card, so we never reintroduce the
 * old near-white paper fills (`emerald-50`, `blue-50`) that vanished in dark mode. Tailwind
 * v4's palette is OKLCH-backed; on-band text uses a tinted `*-50`/`*-950` step, never `#fff`.
 *
 * The `pdf*` triples mirror the screen accent for the always-white PDF page.
 */
export interface LetterAccent {
	/** Solid fill (band / monogram tile). */
	band: string;
	/** Reversed-out text printed *on* the solid fill. */
	bandText: string;
	/** Dimmed reversed-out text for the secondary on-fill line. */
	bandTextMuted: string;
	/** Print RGB of the solid fill. */
	pdfFill: readonly [number, number, number];
	/** Print RGB of the reversed-out text on the fill. */
	pdfInk: readonly [number, number, number];
	/** Print RGB of accent text on white paper (signature). */
	pdfText: readonly [number, number, number];
	/** Accent text on the card surface (light + dark safe). */
	text: string;
}

export const TEMPLATE_ACCENTS: Partial<Record<CoverLetterTemplateName, LetterAccent>> = {
	creative: {
		band: "bg-green-600",
		bandText: "text-green-50",
		bandTextMuted: "text-green-50/80",
		text: "text-green-700 dark:text-green-400",
		pdfFill: [22, 163, 74],
		pdfInk: [240, 253, 244],
		pdfText: [21, 128, 61],
	},
	vibrant: {
		band: "bg-amber-500",
		bandText: "text-amber-950",
		bandTextMuted: "text-amber-950/70",
		text: "text-amber-700 dark:text-amber-400",
		pdfFill: [245, 158, 11],
		pdfInk: [69, 26, 3],
		pdfText: [180, 83, 9],
	},
};

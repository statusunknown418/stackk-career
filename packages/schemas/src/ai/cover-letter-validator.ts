import type { CoverLetterLanguage } from "../api/letters";

/**
 * Hollow phrases / clichés CASEY must not use in a cover letter. Referenced by the
 * system prompt (via `getClichePhrases`).
 *
 * Rules:
 * - Only truly empty or worn-out phrases that hurt the letter.
 * - Minimum 2-3 words to avoid false positives.
 * - Split by language: an English letter isn't checked against Spanish clichés (and
 *   vice versa) — avoids false positives when a greeting or proper noun contains a
 *   word banned in the other language.
 */
export const COVER_LETTER_CLICHE_PHRASES_ES = [
	// Empty adjectives
	"apasionado",
	"apasionada",
	"altamente motivado",
	"altamente motivada",
	"proactivo y dinámico",
	"proactiva y dinámica",
	"team player",
	"trabajador en equipo",
	"trabajadora en equipo",
	"habilidades interpersonales",

	// Generic filler ("me considero…", "tengo la capacidad de…")
	"me considero",
	"tengo la capacidad de",
	"amplia experiencia",
	"siempre dispuesto a aprender",
	"siempre dispuesta a aprender",
	"buscar nuevos retos",

	// Empty filler the model falls back to with sparse CVs — observed in real runs.
	// These catch letters that cite nothing concrete from the CV.
	"cuento con conocimientos",
	"descritas en mi perfil",
	"descritos en mi perfil",
	"estoy convencido de que",
	"me ha permitido desarrollar",
	"siempre he estado interesado",
	"me motiva la oportunidad",
	"agregar valor",
	"aportar valor",
	"estoy emocionado",
	"me emociona",

	// REFUSAL / META-COMMENT PATTERNS — the model writes a refusal or a "please update
	// your CV" message instead of a letter (observed in real runs). That is a message to
	// the user disguised as an artifact; flagged = critical prompt drift.
	"no cuenta con experiencia",
	"no cuento con experiencia",
	"necesito que el cv",
	"necesito que actualices",
	"una vez que actualices",
	"una vez que tengas",
	"para redactar una carta honesta",
	"con gusto redacto",
	"redacto la carta de inmediato",
	"no tengo información suficiente",
	"si me proporcionas",
	"si me das más información",
] as const;

export const COVER_LETTER_CLICHE_PHRASES_EN = [
	// Empty adjectives
	"passionate about",
	"team player",
	"always willing to learn",
	"extensive experience",
	"highly motivated",
	"proactive and dynamic",
	"interpersonal skills",
	"results-driven",
	"go-getter",
	"thinking outside the box",
	"synergy",
	"detail-oriented",
	"self-starter",

	// Generic filler that shows up with thin CVs
	"i consider myself",
	"i have always been",
	"i'm thrilled to",
	"deeply passionate",
	"uniquely positioned",
	"perfect fit",
	"leverage my skills",
	"i'm eager to",
	"bring value",

	// Refusal / meta-comment patterns
	"my cv does not include",
	"my cv lacks",
	"i need your cv to be updated",
	"once you update your cv",
	"i'd be happy to write",
	"i don't have enough information",
	"if you could provide",
] as const;

export function getClichePhrases(language: CoverLetterLanguage): readonly string[] {
	return language === "en" ? COVER_LETTER_CLICHE_PHRASES_EN : COVER_LETTER_CLICHE_PHRASES_ES;
}

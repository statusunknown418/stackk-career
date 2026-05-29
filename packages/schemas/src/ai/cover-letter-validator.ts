import type { CoverLetter } from "./cover-letter";

/**
 * Frases hueras / clichés que CASEY no debe usar al redactar una cover letter.
 *
 * La fuente única de verdad: el system prompt referencia esta lista y el validator
 * en runtime usa la misma para detectar drift cuando el modelo igual las emite.
 *
 * Reglas:
 * - Solo frases verdaderamente vacías o memorables como tales (la palabra
 *   "experiencia" sola NO va aquí — es legítima en contexto).
 * - Mínimo 2-3 palabras para evitar falsos positivos (ej.: "buscar" sola
 *   se confundiría con cualquier verbo de búsqueda).
 * - Match case-insensitive; el validator se encarga de la normalización.
 */
export const COVER_LETTER_CLICHE_PHRASES = [
	"apasionado",
	"apasionada",
	"team player",
	"siempre dispuesto a aprender",
	"siempre dispuesta a aprender",
	"amplia experiencia",
	"me considero",
	"tengo la capacidad de",
	"buscar nuevos retos",
	"altamente motivado",
	"altamente motivada",
	"proactivo y dinámico",
	"proactiva y dinámica",
	"trabajador en equipo",
	"trabajadora en equipo",
	"habilidades interpersonales",
] as const;

export interface CoverLetterValidationResult {
	foundPhrases: readonly string[];
	ok: boolean;
}

/**
 * Escanea body + closing del artifact buscando frases clichés literales
 * (case-insensitive, sin tildes-sensitivity). El greeting + signature se
 * excluyen porque la firma podría contener nombres propios que coincidan
 * y el saludo casi nunca es donde caen los problemas.
 *
 * Devuelve `ok=true` si no encontró ninguna; `false` con la lista exacta
 * de qué encontró si sí. El caller decide qué hacer (loggear, reintentar,
 * flagear). No lanza — el validator es informativo, no bloquea.
 */
export function validateCoverLetter(letter: CoverLetter): CoverLetterValidationResult {
	const haystack = `${letter.body} ${letter.closing}`.toLowerCase();
	const foundPhrases: string[] = [];

	for (const phrase of COVER_LETTER_CLICHE_PHRASES) {
		if (haystack.includes(phrase.toLowerCase())) {
			foundPhrases.push(phrase);
		}
	}

	return {
		foundPhrases,
		ok: foundPhrases.length === 0,
	};
}

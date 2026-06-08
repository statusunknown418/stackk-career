import type { CoverLetterLanguage } from "../api/letters";

/**
 * Frases hueras / clichés que CASEY no debe usar al redactar una cover letter.
 *
 * El system prompt referencia estas listas (vía `getClichePhrases`) para que el
 * modelo no las emita.
 *
 * Reglas:
 * - Solo frases verdaderamente vacías o tan trilladas que dañan la carta.
 * - Mínimo 2-3 palabras para evitar falsos positivos.
 * - Separadas por idioma: una carta en inglés no se evalúa contra clichés
 *   en español (y viceversa) — ahorra falsos positivos cuando el saludo o
 *   un nombre propio incluye una palabra que en el otro idioma es banneada.
 */
export const COVER_LETTER_CLICHE_PHRASES_ES = [
	// Adjetivos vacíos
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

	// Filler genérico ("yo me considero…", "tengo la capacidad de…")
	"me considero",
	"tengo la capacidad de",
	"amplia experiencia",
	"siempre dispuesto a aprender",
	"siempre dispuesta a aprender",
	"buscar nuevos retos",

	// Filler vacío que el modelo cae a meter cuando el CV es pobre — observados
	// en runs reales. Detectan cartas que no citan nada concreto del CV.
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

	// REFUSAL / META-COMMENT PATTERNS — el modelo escribe una negativa o
	// pedido de actualizar el CV en vez de una carta. EJEMPLO REAL observado:
	// "Mi CV no cuenta con experiencia laboral documentada... Para redactar
	// una carta honesta y útil necesito que el CV esté completo... Una vez
	// que actualices tu CV con la información completa, con gusto redacto la
	// carta de inmediato." Eso NO es una cover letter, es un mensaje al user
	// disfrazado de artifact. Flageado = prompt drift crítico.
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

	// Filler genérico que aparece cuando el CV es delgado
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

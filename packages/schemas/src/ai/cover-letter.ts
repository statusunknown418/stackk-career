import { z } from "zod";

/**
 * Cover letter artifact shape.
 *
 * Rendered in /letters/:generationId as four named sections, in order.
 * Each section is plain text (markdown allowed); a TipTap-based rich editor
 * can wrap this without a schema change.
 *
 * Persisted as the latest assistant message of the generation:
 *   messages.objectType = COVER_LETTER_OBJECT_TYPE
 *   messages.object     = CoverLetter
 */
// Generous per-field `.max()`: real letters stay far below, but it cuts injected prompt
// dumps/echoes (Output.object rejects oversized output → retry).
export const coverLetterSchema = z.object({
	greeting: z
		.string()
		.min(1)
		.max(300)
		.describe("Saludo personalizado. Ej: 'Estimada Carolina:' o 'Hola equipo de Yape:'."),
	body: z
		.string()
		.min(1)
		.max(6000)
		.describe(
			"Cuerpo principal. 2-4 párrafos. Conecta la experiencia del CV con el puesto, concreto y sin clichés. Sin frases huecas tipo 'soy un team player apasionado'."
		),
	closing: z
		.string()
		.min(1)
		.max(800)
		.describe("Cierre con CTA suave. Ej: 'Me encantaría conversar cuando le convenga.'"),
	signature: z
		.string()
		.min(1)
		.max(500)
		.describe("Firma con nombre del usuario. Ej: 'Atentamente, María González' o 'Saludos, Joseph'."),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;

/**
 * Stable tag stored in messages.objectType. Bump the suffix if the
 * coverLetterSchema shape changes incompatibly (e.g., v2 adds bullets).
 */
export const COVER_LETTER_OBJECT_TYPE = "cover-letter-v1" as const;

import { z } from "zod";

/**
 * Idiomas soportados para el output del cover letter. Refleja
 * `generationLanguages` en el schema de DB — manteneos sincronizado.
 * Lo dejo acá replicado (no importado desde @stackk-career/db) para
 * que el schemas package no dependa del db package.
 */
export const coverLetterLanguageSchema = z.enum(["es", "en"]);
export type CoverLetterLanguage = z.infer<typeof coverLetterLanguageSchema>;

/**
 * Máximo de versiones (generaciones del artifact) por carta. Fuente única de
 * verdad — el server lo enforcea en `letters.trigger` y la UI lo usa para el
 * badge "Versión n/N", el diálogo de límite y el guard del botón. Solo cuentan
 * versiones no fallidas.
 */
export const MAX_COVER_LETTER_VERSIONS = 5;

/**
 * Input for the dialog at /letters: pick the target job position, which CV to link,
 * and the output language. The API creates a `generation` of type "cover-letter"
 * with the linked resumeId + language and returns its id, which becomes
 * /letters/:generationId. `language` defaults a `es` para LATAM.
 */
export const createCoverLetterGenerationInputSchema = z.object({
	jobPosition: z.string().trim().min(1).max(500),
	jobDescription: z.string().trim().max(5000).optional(),
	language: coverLetterLanguageSchema.default("es"),
	resumeId: z.string().nonempty(),
});
export type CreateCoverLetterGenerationInput = z.infer<typeof createCoverLetterGenerationInputSchema>;

/**
 * Input for triggering the CASEY-Letters task from the chat at /letters/:generationId.
 * The task reads jobPosition + resumeId + language from the generation itself; el
 * user's free-form extra prompt se forwardea per turn.
 *
 * `language` opcional: si se pasa, override el valor del generation row Y persiste
 * el cambio en DB (así re-triggers posteriores arrancan en el nuevo idioma sin
 * volver a pasar el override). Usado por el preset "En inglés" / "En español" del
 * artifact panel para cambiar idioma a mitad de hilo sin re-crear la carta.
 */
export const triggerCoverLetterInputSchema = z.object({
	generationId: z.string().nonempty(),
	extraPrompt: z.string().max(2000).optional(),
	language: coverLetterLanguageSchema.optional(),
});
export type TriggerCoverLetterInput = z.infer<typeof triggerCoverLetterInputSchema>;

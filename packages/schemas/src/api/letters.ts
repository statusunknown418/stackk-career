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
 * Input for the dialog at /letters: pick the target job position, which CV to link,
 * and the output language. The API creates a `generation` of type "cover-letter"
 * with the linked resumeId + language and returns its id, which becomes
 * /letters/:generationId. `language` defaults a `es` para LATAM.
 */
export const createCoverLetterGenerationInputSchema = z.object({
	jobPosition: z.string().trim().min(1).max(500),
	language: coverLetterLanguageSchema.default("es"),
	resumeId: z.string().nonempty(),
});
export type CreateCoverLetterGenerationInput = z.infer<typeof createCoverLetterGenerationInputSchema>;

/**
 * Input for triggering the CASEY-Letters task from the chat at /letters/:generationId.
 * The task reads jobPosition + resumeId + language from the generation itself; only the
 * user's free-form extra prompt is forwarded per turn.
 */
export const triggerCoverLetterInputSchema = z.object({
	generationId: z.string().nonempty(),
	extraPrompt: z.string().max(2000).optional(),
});
export type TriggerCoverLetterInput = z.infer<typeof triggerCoverLetterInputSchema>;

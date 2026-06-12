import { z } from "zod";

/**
 * Supported cover-letter output languages. Mirrors `generationLanguages` in the DB
 * schema — keep in sync. Replicated here (not imported from @stackk-career/db) so the
 * schemas package doesn't depend on the db package.
 */
export const coverLetterLanguageSchema = z.enum(["es", "en"]);
export type CoverLetterLanguage = z.infer<typeof coverLetterLanguageSchema>;

export const coverLetterTemplateSchema = z.enum(["centered", "classic", "minty", "blue"]).optional().nullable();
export type CoverLetterTemplate = z.infer<typeof coverLetterTemplateSchema>;

/**
 * Input for the dialog at /letters: pick the target job position, which CV to link,
 * and the output language. The API creates a `generation` of type "cover-letter"
 * with the linked resumeId + language and returns its id, which becomes
 * /letters/:generationId. `language` defaults to `es` for LATAM.
 */
export const createCoverLetterGenerationInputSchema = z.object({
	jobPosition: z.string().trim().min(1).max(500),
	jobDescription: z.string().trim().max(5000).optional(),
	language: coverLetterLanguageSchema.default("es"),
	resumeId: z.string().nonempty(),
	template: coverLetterTemplateSchema,
});
export type CreateCoverLetterGenerationInput = z.infer<typeof createCoverLetterGenerationInputSchema>;

/**
 * Input for triggering the CASEY-Letters task from the chat at /letters/:generationId.
 * The task reads jobPosition + resumeId + language from the generation itself; the
 * user's free-form extra prompt is forwarded per turn.
 *
 * Optional `language`: when passed, overrides the generation row's value AND persists
 * the change in DB (so later re-triggers start in the new language without re-passing
 * the override). Used by the artifact panel's language presets to switch mid-thread
 * without recreating the letter.
 */
export const triggerCoverLetterInputSchema = z.object({
	generationId: z.string().nonempty(),
	extraPrompt: z.string().max(2000).optional(),
	language: coverLetterLanguageSchema.optional(),
});
export type TriggerCoverLetterInput = z.infer<typeof triggerCoverLetterInputSchema>;

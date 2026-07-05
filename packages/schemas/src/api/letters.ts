import { z } from "zod";

/**
 * Supported cover-letter output languages. Mirrors `generationLanguages` in the DB
 * schema — keep in sync. Replicated here (not imported from @stackk-career/db) so the
 * schemas package doesn't depend on the db package.
 */
export const coverLetterLanguageSchema = z.enum(["es", "en"]);
export type CoverLetterLanguage = z.infer<typeof coverLetterLanguageSchema>;

export const coverLetterTemplateNames = ["standard", "modern", "editorial", "creative", "vibrant"] as const;
export type CoverLetterTemplateName = (typeof coverLetterTemplateNames)[number];

export const coverLetterTemplateSchema = z.enum(coverLetterTemplateNames).optional().nullable();
export type CoverLetterTemplate = z.infer<typeof coverLetterTemplateSchema>;

/** Default template applied when a letter has none, or an unknown legacy value. */
export const DEFAULT_TEMPLATE: CoverLetterTemplateName = "standard";

export const TEMPLATE_LABELS = {
	creative: "Creativo",
	editorial: "Editorial",
	modern: "Moderno",
	standard: "Estándar",
	vibrant: "Vibrante",
} as const;

/** Selectable templates for the creation form: value, label, one-line description. */
export const TEMPLATE_OPTIONS: ReadonlyArray<{
	description: string;
	label: string;
	value: CoverLetterTemplateName;
}> = [
	// {
	// 	description: "Carta de negocios alineada a la izquierda, sobria y directa.",
	// 	label: "Estándar",
	// 	value: "standard",
	// },
	{
		description: "Encabezado destacado con tipografía limpia y actual.",
		label: "Moderno",
		value: "modern",
	},
	{
		description: "Serif elegante y amplio espaciado, con aire editorial.",
		label: "Editorial",
		value: "editorial",
	},
	{
		description: "Encabezado con banda de color: llamativo, moderno y directo.",
		label: "Creativo",
		value: "creative",
	},
	{
		description: "Monograma de color con tus iniciales: cálido y con carácter.",
		label: "Vibrante",
		value: "vibrant",
	},
];

/** Legacy persisted templates mapped to the current typography-led set. */
const LEGACY_TEMPLATE_MAP: Record<string, CoverLetterTemplateName> = {
	blue: "creative",
	centered: "editorial",
	classic: "standard",
	minty: "vibrant",
};

/** Map any persisted, legacy, or empty template value to a current template name. */
export function normalizeTemplate(value: string | null | undefined): CoverLetterTemplateName {
	if (value && (coverLetterTemplateNames as readonly string[]).includes(value)) {
		return value as CoverLetterTemplateName;
	}
	const mapped = value ? LEGACY_TEMPLATE_MAP[value] : undefined;
	return mapped ?? DEFAULT_TEMPLATE;
}

/**
 * Where a cover letter's job context comes from:
 * - `manual`: the user typed `jobPosition` (+ optional `jobDescription`).
 * - `resume-job-target`: reuse the selected resume's READY `resume_job_targets`
 *   row; the API snapshots its normalized data into `title`/`summary`, so no
 *   client-supplied job text is needed.
 */
export const coverLetterGenerationSourceSchema = z.enum(["manual", "resume-job-target"]);
export type CoverLetterGenerationSource = z.infer<typeof coverLetterGenerationSourceSchema>;

/**
 * Input for the dialog at /letters: pick the target job position, which CV to link,
 * and the output language. The API creates a `generation` of type "cover-letter"
 * with the linked resumeId + language and returns its id, which becomes
 * /letters/:generationId. `language` defaults to `es` for LATAM.
 *
 * `source` defaults to `manual` so existing callers (and the manual dialog) need
 * no changes. In `resume-job-target` mode the API derives the job context from the
 * resume's stored target, so `jobPosition`/`jobDescription` are not required.
 */
export const createCoverLetterGenerationInputSchema = z
	.object({
		source: coverLetterGenerationSourceSchema.default("manual"),
		jobPosition: z.string().trim().min(1).max(500).optional(),
		jobDescription: z.string().trim().max(5000).optional(),
		language: coverLetterLanguageSchema.default("es"),
		resumeId: z.string().nonempty(),
		template: coverLetterTemplateSchema,
	})
	.refine((input) => input.source !== "manual" || (input.jobPosition?.length ?? 0) > 0, {
		message: "Indica el puesto al que vas a postular.",
		path: ["jobPosition"],
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

/**
 * Input for renaming a cover letter from the workspace header. The title doubles as the
 * letter's target job position (`generations.title`), which CASEY reads on every re-trigger,
 * so it must stay non-empty — mirrors the resume title's `min(1)` constraint.
 */
export const updateCoverLetterTitleSchema = z.object({
	generationId: z.string().nonempty(),
	title: z.string().trim().min(1),
});
export type UpdateCoverLetterTitleInput = z.infer<typeof updateCoverLetterTitleSchema>;

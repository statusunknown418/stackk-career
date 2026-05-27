import { z } from "zod";
import { blockRowSchema, contactContentSchema, sectionContentSchema } from "../db/resume-blocks";
import { selectResumeSchema } from "../db/resumes";

export const resumeListContactSchema = contactContentSchema.pick({
	firstName: true,
	lastName: true,
});

export const resumeListItemSchema = selectResumeSchema.extend({
	contact: resumeListContactSchema.nullable().optional(),
});

export const blankResumeSectionSchema = sectionContentSchema.pick({
	isCustom: true,
	layout: true,
	title: true,
});

export const SECTION_KINDS = [
	"summary",
	"experience",
	"education",
	"skills",
	"languages",
	"certifications",
	"projects",
	"volunteering",
	"custom",
] as const;
export const sectionKindSchema = z.enum(SECTION_KINDS);
export type SectionKind = z.infer<typeof sectionKindSchema>;

type SectionLayout = z.infer<typeof sectionContentSchema>["layout"];
type DefinedSectionKind = Exclude<SectionKind, "custom">;

interface SectionDefinition {
	description: string;
	isUnique: boolean;
	kind: DefinedSectionKind;
	layout: SectionLayout;
	title: string;
}

export const SECTION_DEFINITIONS = [
	{
		kind: "summary",
		title: "Resumen profesional",
		layout: "freeform",
		isUnique: true,
		description: "Párrafo breve con tu propuesta de valor y experiencia clave.",
	},
	{
		kind: "experience",
		title: "Experiencia profesional",
		layout: "entries",
		isUnique: true,
		description: "Cargos, empresas y logros cuantificados con verbos de acción.",
	},
	{
		kind: "education",
		title: "Educación",
		layout: "entries",
		isUnique: true,
		description: "Títulos, instituciones y fechas de tus estudios formales.",
	},
	{
		kind: "skills",
		title: "Habilidades",
		layout: "skills",
		isUnique: true,
		description: "Stack técnico y competencias agrupadas por categoría.",
	},
	{
		kind: "languages",
		title: "Idiomas",
		layout: "skills",
		isUnique: true,
		description: "Idiomas que dominas con su nivel de proficiencia.",
	},
	{
		kind: "certifications",
		title: "Certificaciones",
		layout: "entries",
		isUnique: true,
		description: "Credenciales y certificados profesionales relevantes.",
	},
	{
		kind: "projects",
		title: "Proyectos",
		layout: "entries",
		isUnique: true,
		description: "Trabajos personales o profesionales que muestran tu impacto.",
	},
	{
		kind: "volunteering",
		title: "Voluntariado",
		layout: "entries",
		isUnique: true,
		description: "Actividades sin fines de lucro y compromiso comunitario.",
	},
] as const satisfies readonly SectionDefinition[];

const normalizeSectionTitle = (value: string) => value.trim().toLowerCase();

export const getSectionKind = (section: z.infer<typeof sectionContentSchema>): SectionKind => {
	if (section.isCustom) {
		return "custom";
	}
	const target = normalizeSectionTitle(section.title);
	const match = SECTION_DEFINITIONS.find((definition) => normalizeSectionTitle(definition.title) === target);
	return match?.kind ?? "custom";
};

interface EntryLabels {
	addCta: string;
	subtitle: string;
	title: string;
}

export const ENTRY_LABELS = {
	experience: { title: "Cargo", subtitle: "Empresa", addCta: "Agregar experiencia" },
	education: { title: "Título", subtitle: "Institución", addCta: "Agregar formación" },
	certifications: { title: "Certificación", subtitle: "Emisor", addCta: "Agregar certificación" },
	projects: { title: "Proyecto", subtitle: "Stack o cliente", addCta: "Agregar proyecto" },
	volunteering: { title: "Rol", subtitle: "Organización", addCta: "Agregar voluntariado" },
	summary: { title: "Título", subtitle: "Subtítulo", addCta: "Agregar entrada" },
	skills: { title: "Título", subtitle: "Subtítulo", addCta: "Agregar entrada" },
	languages: { title: "Título", subtitle: "Subtítulo", addCta: "Agregar entrada" },
	custom: { title: "Título", subtitle: "Subtítulo", addCta: "Agregar entrada" },
} as const satisfies Record<SectionKind, EntryLabels>;

interface EntryNoun {
	plural: string;
	singular: string;
}

export const ENTRY_NOUNS = {
	experience: { singular: "entrada", plural: "entradas" },
	education: { singular: "entrada", plural: "entradas" },
	certifications: { singular: "certificación", plural: "certificaciones" },
	projects: { singular: "proyecto", plural: "proyectos" },
	volunteering: { singular: "rol", plural: "roles" },
	summary: { singular: "párrafo", plural: "párrafos" },
	skills: { singular: "habilidad", plural: "habilidades" },
	languages: { singular: "idioma", plural: "idiomas" },
	custom: { singular: "entrada", plural: "entradas" },
} as const satisfies Record<SectionKind, EntryNoun>;

export const isTimelineSectionKind = (kind: SectionKind): boolean => kind === "experience" || kind === "education";

const DEFAULT_SECTION_KINDS: readonly DefinedSectionKind[] = ["summary", "experience", "education", "skills"];

export const blankResumeSections = SECTION_DEFINITIONS.filter((definition) =>
	(DEFAULT_SECTION_KINDS as readonly string[]).includes(definition.kind)
).map((definition) => ({
	title: definition.title,
	layout: definition.layout,
	isCustom: false,
})) satisfies readonly z.infer<typeof blankResumeSectionSchema>[];

export type ResumeListContact = z.infer<typeof resumeListContactSchema>;
export type ResumeListItem = z.infer<typeof resumeListItemSchema>;
export type BlankResumeSection = z.infer<typeof blankResumeSectionSchema>;

/**
 * @description use this for the $resumeId.tsx form
 */
export const resumeDocumentWrapperFormSchema = z.object({
	id: z.string(),
	title: z.string().min(1),
	blocks: z.array(blockRowSchema),
});

export const updateResumeTitleSchema = z.object({
	id: z.string(),
	title: z.string().min(1),
});

export const createResumeInputSchema = z.object({
	targetRole: z.string().trim().min(1).max(120).optional(),
});

export const getResumeAnalysisInputSchema = z.object({
	resumeId: z.string().nonempty(),
});
export type GetResumeAnalysisInput = z.infer<typeof getResumeAnalysisInputSchema>;

export type ResumeDocumentWrapperForm = z.infer<typeof resumeDocumentWrapperFormSchema>;
export type UpdateResumeTitleInput = z.infer<typeof updateResumeTitleSchema>;
export type CreateResumeInput = z.infer<typeof createResumeInputSchema>;

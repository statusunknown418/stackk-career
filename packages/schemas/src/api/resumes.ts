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

export const blankResumeSections = [
	{
		title: "Resumen profesional",
		layout: "freeform",
		isCustom: false,
	},
	{
		title: "Experiencia laboral",
		layout: "entries",
		isCustom: false,
	},
	{
		title: "Educación",
		layout: "entries",
		isCustom: false,
	},
	{
		title: "Habilidades",
		layout: "skills",
		isCustom: false,
	},
] satisfies readonly z.infer<typeof blankResumeSectionSchema>[];

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

export type ResumeDocumentWrapperForm = z.infer<typeof resumeDocumentWrapperFormSchema>;
export type UpdateResumeTitleInput = z.infer<typeof updateResumeTitleSchema>;

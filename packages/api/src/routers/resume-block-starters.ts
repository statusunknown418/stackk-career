import type { ContentOf } from "@stackk-career/schemas/ai/resume-blocks";
import type { BlankResumeSection } from "@stackk-career/schemas/api/resumes";

export type StarterChildPayload =
	| {
			blockType: "entry";
			content: ContentOf<"entry">;
	  }
	| {
			blockType: "paragraph";
			content: ContentOf<"paragraph">;
	  }
	| {
			blockType: "skill_line";
			content: ContentOf<"skill_line">;
	  };

export const createStarterChildPayload = (layout: BlankResumeSection["layout"]): StarterChildPayload => {
	switch (layout) {
		case "freeform":
			return {
				blockType: "paragraph",
				content: {
					text: "Escribe aqui el contenido principal de esta seccion.",
					format: "plain",
					aiSuggested: false,
				},
			};
		case "skills":
			return {
				blockType: "skill_line",
				content: {
					label: "Nueva categoria",
					category: "other",
				},
			};
		default:
			return {
				blockType: "entry",
				content: {
					title: "Nuevo elemento",
					subtitle: "Agrega puesto, institucion o proyecto",
					descriptor: "Edita este elemento para añadir fechas, ubicacion e impacto.",
					entryStyle: "standard",
					isCurrent: false,
				},
			};
	}
};

export const fallbackContactName = "Perfil";
export const whitespacePattern = /\s+/;

export const getSeedContact = (fullName: string | null | undefined, email: string) => {
	const normalizedName = fullName?.trim() ?? "";
	const parts = normalizedName.split(whitespacePattern).filter(Boolean);
	const emailName = email.split("@")[0]?.trim() || fallbackContactName;

	if (parts.length >= 2) {
		return {
			firstName: parts[0] ?? fallbackContactName,
			lastName: parts.slice(1).join(" "),
		};
	}

	if (parts.length === 1) {
		return {
			firstName: parts[0] ?? fallbackContactName,
			lastName: fallbackContactName,
		};
	}

	return {
		firstName: emailName,
		lastName: fallbackContactName,
	};
};

export const createContactSeedBlock = (
	resumeId: string,
	userName: string | null | undefined,
	email: string,
	position: string
) => {
	const contact = getSeedContact(userName, email);
	return {
		resumeId,
		blockType: "contact" as const,
		position,
		content: {
			firstName: contact.firstName,
			lastName: contact.lastName,
			items: [
				{
					kind: "email",
					label: "Email",
					value: email,
				},
			],
		},
	};
};

import type { BlankResumeSection } from "@stackk-career/schemas/api/resumes";
import type { ContentOf } from "@stackk-career/schemas/db/resume-blocks";

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
					text: "",
					format: "html",
					aiSuggested: false,
				},
			};
		case "skills":
			return {
				blockType: "skill_line",
				content: {
					label: "",
					category: "other",
				},
			};
		default:
			return {
				blockType: "entry",
				content: {
					title: "",
					subtitle: "",
					descriptor: "",
					descriptorFormat: "html",
					entryStyle: "standard",
					isCurrent: false,
					isRemote: false,
					workSetting: "onsite",
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

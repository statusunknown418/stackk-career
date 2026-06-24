import { type BlankResumeSection, blankResumeSections } from "@stackk-career/schemas/api/resumes";
import type { ContentOf } from "@stackk-career/schemas/db/resume-blocks";
import { generateLexoKeyBetween } from "@stackk-career/schemas/utils/lexographical";

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

/**
 * Build the ordered root seed blocks for a new resume (contact + one block per default
 * section), assigning fractional positions in order. Returns the section content keyed by
 * position so {@link buildStarterChildBlocks} can attach the matching starter child once the
 * rows have been inserted and their ids are known.
 */
export const buildResumeRootSeed = ({
	email,
	name,
	resumeId,
}: {
	email: string;
	name: string | null | undefined;
	resumeId: string;
}) => {
	let previousPosition: string | null = null;

	const contactPosition = generateLexoKeyBetween(previousPosition, null);
	previousPosition = contactPosition;
	const contactSeedBlock = createContactSeedBlock(resumeId, name, email, contactPosition);

	const sectionSeedBlocks = blankResumeSections.map((section) => {
		const position = generateLexoKeyBetween(previousPosition, null);
		previousPosition = position;

		return {
			resumeId,
			blockType: "section" as const,
			position,
			content: section,
		};
	});

	const sectionContentByPosition = new Map(
		sectionSeedBlocks.map((section) => [section.position, section.content] as const)
	);

	return {
		rootBlocks: [contactSeedBlock, ...sectionSeedBlocks],
		sectionContentByPosition,
	};
};

/**
 * Attach a starter child block to each freshly-inserted section, picking the child layout
 * from the section content recorded by {@link buildResumeRootSeed}. All children share one
 * fractional position since each lives under a distinct parent.
 */
export const buildStarterChildBlocks = ({
	createdSections,
	resumeId,
	sectionContentByPosition,
}: {
	createdSections: { id: number; position: string }[];
	resumeId: string;
	sectionContentByPosition: Map<string, BlankResumeSection>;
}) => {
	const position = generateLexoKeyBetween(null, null);

	return createdSections.map((block) => {
		const section = sectionContentByPosition.get(block.position);

		if (!section) {
			throw new Error(`Missing section seed metadata for position: ${block.position}`);
		}

		const starterChild = createStarterChildPayload(section.layout);

		return {
			resumeId,
			parentBlockId: block.id,
			blockType: starterChild.blockType,
			content: starterChild.content,
			position,
		};
	});
};

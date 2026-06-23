import { parseBlock } from "@stackk-career/schemas/db/resume-blocks";

const CONTACT_DETAIL_PRIORITY = ["email", "address", "website", "phone", "linkedin", "other"] as const;

export interface ContactSummary {
	detail: string | null;
	firstName: string;
	lastName: string;
}

/**
 * Reduce a raw root contact block to the fields `resumes.list` surfaces: the display name and
 * the highest-priority filled-in contact detail. Returns null for any non-contact row so the
 * caller can map a heterogeneous block set in one pass.
 */
export const summarizeContactBlock = (raw: Parameters<typeof parseBlock>[0]): ContactSummary | null => {
	const block = parseBlock(raw);

	if (block.blockType !== "contact") {
		return null;
	}

	let detail: string | null = null;
	for (const kind of CONTACT_DETAIL_PRIORITY) {
		const value = block.content.items.find((item) => item.kind === kind)?.value.trim();
		if (value) {
			detail = value;
			break;
		}
	}

	return {
		detail,
		firstName: block.content.firstName,
		lastName: block.content.lastName,
	};
};

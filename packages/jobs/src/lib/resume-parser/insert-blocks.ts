import type { TriggerDb } from "@stackk-career/db/http";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import type { EntriesSection, SkillsSection, SummarySection } from "@stackk-career/schemas/jobs/resume-parser";
import { withLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import type { PlannedSection } from "./plan-sections";

/** When the contact extraction fails, build a minimal contact from the validation candidateName. */
export const fallbackContactFromName = (candidateName: string | null) => {
	const [firstName = "", ...rest] = (candidateName ?? "").split(" ");
	return { firstName, lastName: rest.join(" "), items: [] };
};

const insertFreeformChildren = (db: TriggerDb, resumeId: string, sectionId: number, payload: SummarySection) => {
	const rows = withLexoPositions(payload.paragraphs).map(({ item, position }) => ({
		resumeId,
		parentBlockId: sectionId,
		blockType: "paragraph" as const,
		position,
		content: item,
	}));

	return rows.length > 0 ? db.insert(resumeBlocks).values(rows) : Promise.resolve();
};

const insertEntriesChildren = (db: TriggerDb, resumeId: string, sectionId: number, payload: EntriesSection) => {
	const rows = withLexoPositions(payload.entries).map(({ item: entry, position }) => ({
		resumeId,
		parentBlockId: sectionId,
		blockType: "entry" as const,
		position,
		content: entry,
	}));

	return rows.length > 0 ? db.insert(resumeBlocks).values(rows) : Promise.resolve();
};

const insertSkillsChildren = async (db: TriggerDb, resumeId: string, sectionId: number, payload: SkillsSection) => {
	if (payload.lines.length === 0) {
		return;
	}

	const linePlans = withLexoPositions(payload.lines).map(({ item: line, position }) => {
		const { items, ...content } = line;
		return {
			position,
			items,
			row: {
				resumeId,
				parentBlockId: sectionId,
				blockType: "skill_line" as const,
				position,
				content,
			},
		};
	});

	const createdLines = await db
		.insert(resumeBlocks)
		.values(linePlans.map((plan) => plan.row))
		.returning({ id: resumeBlocks.id, position: resumeBlocks.position });

	const lineIdByPosition = new Map(createdLines.map((row) => [row.position, row.id]));

	const itemRows = linePlans.flatMap((plan) => {
		const lineId = lineIdByPosition.get(plan.position);

		if (!lineId || plan.items.length === 0) {
			return [];
		}

		return withLexoPositions(plan.items).map(({ item, position }) => ({
			resumeId,
			parentBlockId: lineId,
			blockType: "skill_item" as const,
			position,
			content: item,
		}));
	});

	if (itemRows.length > 0) {
		await db.insert(resumeBlocks).values(itemRows);
	}
};

/** Dispatch child-insert by section layout. Discriminated union → no casts. */
export const insertSectionChildren = (db: TriggerDb, resumeId: string, sectionId: number, section: PlannedSection) => {
	switch (section.layout) {
		case "freeform":
			return insertFreeformChildren(db, resumeId, sectionId, section.payload);
		case "entries":
			return insertEntriesChildren(db, resumeId, sectionId, section.payload);
		case "skills":
			return insertSkillsChildren(db, resumeId, sectionId, section.payload);
		default:
			return;
	}
};

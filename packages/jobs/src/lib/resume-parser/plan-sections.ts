import { SECTION_DEFINITIONS, type SectionKind } from "@stackk-career/schemas/api/resumes";
import type { EntriesSection, SkillsSection, SummarySection } from "@stackk-career/schemas/jobs/resume-parser";
import type { runResumeParserAgent } from "../../agents/resume-parser";

type SectionDefinition = (typeof SECTION_DEFINITIONS)[number];
type DefinedSectionKind = Exclude<SectionKind, "custom">;
type AgentOutput = Awaited<ReturnType<typeof runResumeParserAgent>>;

/** A non-empty section selected for insertion. Discriminated by `layout` so the dispatcher narrows `payload` without casts. */
export type PlannedSection =
	| { layout: "freeform"; definition: SectionDefinition; payload: SummarySection }
	| { layout: "entries"; definition: SectionDefinition; payload: EntriesSection }
	| { layout: "skills"; definition: SectionDefinition; payload: SkillsSection };

const DEFINITION_BY_KIND = new Map<DefinedSectionKind, SectionDefinition>(
	SECTION_DEFINITIONS.map((definition) => [definition.kind, definition])
);

const getDefinition = (kind: DefinedSectionKind): SectionDefinition => {
	const definition = DEFINITION_BY_KIND.get(kind);
	if (!definition) {
		throw new Error(`Section definition missing for kind: ${kind}`);
	}
	return definition;
};

/** Convert the agent output into the ordered list of non-empty sections to persist. */
export const planSections = (agentOutput: AgentOutput): PlannedSection[] => {
	const planned: PlannedSection[] = [];

	if (agentOutput.summary && agentOutput.summary.paragraphs.length > 0) {
		planned.push({ layout: "freeform", definition: getDefinition("summary"), payload: agentOutput.summary });
	}

	const entriesSections: ReadonlyArray<readonly [DefinedSectionKind, EntriesSection | null]> = [
		["experience", agentOutput.experience],
		["education", agentOutput.education],
		["certifications", agentOutput.certifications],
		["projects", agentOutput.projects],
		["volunteering", agentOutput.volunteering],
	];

	for (const [kind, section] of entriesSections) {
		if (section && section.entries.length > 0) {
			planned.push({ layout: "entries", definition: getDefinition(kind), payload: section });
		}
	}

	const skillsSections: ReadonlyArray<readonly [DefinedSectionKind, SkillsSection | null]> = [
		["skills", agentOutput.skills],
		["languages", agentOutput.languages],
	];

	for (const [kind, section] of skillsSections) {
		if (section && section.lines.length > 0) {
			planned.push({ layout: "skills", definition: getDefinition(kind), payload: section });
		}
	}

	return planned;
};

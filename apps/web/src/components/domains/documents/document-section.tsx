import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { TimelineSection } from "../resume-editor/timeline-section";
import { ResumeDocumentEmptyState } from "./document-empty-state";
import { ResumeDocumentSkillsSection } from "./document-skills-section";
import { ResumeDocumentEntriesSection } from "./entries-section";
import { ResumeDocumentParagraphList } from "./paragraph-list";

interface ResumeDocumentSectionProps {
	block: BlockNode;
	isLast: boolean;
}

export const ResumeDocumentSection = ({ block, isLast }: ResumeDocumentSectionProps) => {
	if (block.blockType !== "section") {
		return null;
	}

	const paragraphs = sortLexoPositions(
		block.children.filter((child) => child.blockType === "paragraph"),
		(child) => child.position
	);

	return (
		<TimelineSection isLast={isLast} title={block.content.title}>
			{block.content.layout === "freeform" && <ResumeDocumentParagraphList paragraphs={paragraphs} />}
			{block.content.layout === "entries" && <ResumeDocumentEntriesSection blocks={block.children} />}
			{block.content.layout === "skills" && <ResumeDocumentSkillsSection blocks={block.children} />}

			{!["freeform", "entries", "skills"].includes(block.content.layout) && (
				<ResumeDocumentEmptyState message="Tipo de sección no soportado todavía." />
			)}
		</TimelineSection>
	);
};

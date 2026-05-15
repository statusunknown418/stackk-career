import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { formatDateRange } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { ResumeDocumentEmptyState } from "./document-empty-state";
import { ResumeDocumentParagraphList } from "./paragraph-list";

interface ResumeDocumentEntriesSectionProps {
	blocks: BlockNode[];
}

interface ResumeDocumentEntryBlockProps {
	block: BlockNode;
}

const ResumeDocumentEntryBlock = ({ block }: ResumeDocumentEntryBlockProps) => {
	if (block.blockType !== "entry") {
		return null;
	}

	const bullets = sortLexoPositions(
		block.children.filter((child) => child.blockType === "bullet"),
		(child) => child.position
	);
	const paragraphs = sortLexoPositions(
		block.children.filter((child) => child.blockType === "paragraph"),
		(child) => child.position
	);
	const dateRange = formatDateRange(block.content.startDate, block.content.endDate, block.content.isCurrent);

	return (
		<li className="space-y-3 pl-2">
			<article className="space-y-2">
				<header className="space-y-1">
					<p className="font-semibold text-base text-foreground">{block.content.title}</p>

					{block.content.subtitle && <p className="text-base text-muted-foreground">{block.content.subtitle}</p>}

					{block.content.descriptor && <p className="text-muted-foreground text-sm">{block.content.descriptor}</p>}

					{(dateRange || block.content.location) && (
						<p className="text-muted-foreground text-sm">
							{dateRange && <span>{dateRange}</span>}
							{dateRange && block.content.location && <span>{" · "}</span>}
							{block.content.location && <span>{block.content.location}</span>}
						</p>
					)}
				</header>

				{bullets.length > 0 && (
					<ul className="list-disc space-y-1 pl-5 text-foreground text-sm">
						{bullets.map((bullet) => bullet.blockType === "bullet" && <li key={bullet.id}>{bullet.content.text}</li>)}
					</ul>
				)}

				{paragraphs.length > 0 && <ResumeDocumentParagraphList paragraphs={paragraphs} />}
			</article>
		</li>
	);
};

export const ResumeDocumentEntriesSection = ({ blocks }: ResumeDocumentEntriesSectionProps) => {
	const entries = sortLexoPositions(
		blocks.filter((child) => child.blockType === "entry"),
		(child) => child.position
	);

	if (!entries.length) {
		return <ResumeDocumentEmptyState message="Sin entradas todavía." />;
	}

	return (
		<ul className="flex flex-col gap-6">
			{entries.map((entry) => (
				<ResumeDocumentEntryBlock block={entry} key={entry.id} />
			))}
		</ul>
	);
};

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { ResumeDocumentEmptyState } from "./document-empty-state";

interface ResumeDocumentSkillsSectionProps {
	blocks: BlockNode[];
}

export const ResumeDocumentSkillsSection = ({ blocks }: ResumeDocumentSkillsSectionProps) => {
	const lines = sortLexoPositions(
		blocks.filter((child) => child.blockType === "skill_line"),
		(child) => child.position
	);

	if (lines.length === 0) {
		return <ResumeDocumentEmptyState message="Sin habilidades todavía." />;
	}

	return (
		<div className="flex flex-col gap-4">
			{lines.map((line) => {
				if (line.blockType !== "skill_line") {
					return null;
				}

				const items = sortLexoPositions(
					line.children.filter((child) => child.blockType === "skill_item"),
					(child) => child.position
				);

				return (
					<div className="space-y-2 pl-2" key={line.id}>
						<p className="font-medium text-sm uppercase tracking-wide">{line.content.label}</p>

						{items.length > 0 ? (
							<ul className="flex flex-wrap gap-2">
								{items.map(
									(item) =>
										item.blockType === "skill_item" && (
											<li className="rounded-full border bg-background px-3 py-1 text-sm" key={item.id}>
												<span>{item.content.value}</span>
												{item.content.proficiency && (
													<span className="text-muted-foreground">{` · ${item.content.proficiency}`}</span>
												)}
											</li>
										)
								)}
							</ul>
						) : (
							<ResumeDocumentEmptyState message="Sin items todavía." />
						)}
					</div>
				);
			})}
		</div>
	);
};

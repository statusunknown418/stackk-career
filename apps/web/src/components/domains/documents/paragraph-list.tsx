import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { proseContentToHtml } from "@stackk-career/schemas/db/resume-blocks";
import { ResumeRichTextField } from "../resume-editor/resume-rich-text-field";
import { ResumeDocumentEmptyState } from "./document-empty-state";

interface ResumeDocumentParagraphListProps {
	paragraphs: BlockNode[];
}

export const ResumeDocumentParagraphList = ({ paragraphs }: ResumeDocumentParagraphListProps) => {
	if (paragraphs.length === 0) {
		return <ResumeDocumentEmptyState message="Sin contenido todavía." />;
	}

	return (
		<div className="flex flex-col gap-2">
			{paragraphs.map(
				(paragraph) =>
					paragraph.blockType === "paragraph" && (
						<ResumeRichTextField
							key={paragraph.id}
							readOnly
							value={proseContentToHtml(paragraph.content.text, paragraph.content.format)}
						/>
					)
			)}
		</div>
	);
};

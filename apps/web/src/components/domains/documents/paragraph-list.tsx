import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { ResumeRichTextField } from "../resume-editor/resume-rich-text-field";
import { ResumeDocumentEmptyState } from "./document-empty-state";

interface ResumeDocumentParagraphListProps {
	paragraphs: BlockNode[];
}

const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

const blockTextToHtml = (value: string): string => `<p>${escapeHtml(value)}</p>`;

export const ResumeDocumentParagraphList = ({ paragraphs }: ResumeDocumentParagraphListProps) => {
	if (paragraphs.length === 0) {
		return <ResumeDocumentEmptyState message="Sin contenido todavía." />;
	}

	return (
		<div className="flex flex-col gap-2">
			{paragraphs.map(
				(paragraph) =>
					paragraph.blockType === "paragraph" && (
						<ResumeRichTextField initialContent={blockTextToHtml(paragraph.content.text)} key={paragraph.id} readOnly />
					)
			)}
		</div>
	);
};

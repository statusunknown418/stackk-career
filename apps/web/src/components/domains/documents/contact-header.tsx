import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { getContactItemLabel } from "@stackk-career/schemas/db/resume-blocks";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";

interface ResumeDocumentContactHeaderProps {
	block: BlockNode;
}

export const ResumeDocumentContactHeader = ({ block }: ResumeDocumentContactHeaderProps) => {
	if (block.blockType !== "contact") {
		return null;
	}

	const fullName = `${block.content.firstName} ${block.content.lastName}`.trim();

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>{fullName}</FrameTitle>
				<FrameDescription>Información de contacto</FrameDescription>
			</FrameHeader>
			<FramePanel>
				<ul className="flex flex-wrap gap-2 text-muted-foreground text-sm">
					{block.content.items.map((item) => (
						<li className="rounded-full border bg-background px-3 py-1" key={`${item.kind}-${item.value}`}>
							<span className="font-medium text-foreground">{getContactItemLabel(item.kind, item.label)}:</span>{" "}
							<span>{item.value}</span>
						</li>
					))}
				</ul>
			</FramePanel>
		</Frame>
	);
};

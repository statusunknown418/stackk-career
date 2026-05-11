"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { TimelineSection } from "../timeline-section";
import { EntryEditor } from "./entry-editor";
import { ParagraphEditor } from "./paragraph-editor";
import { SkillsEditor } from "./skills-editor";

type SectionBlock = Extract<BlockNode, { blockType: "section" }>;

export const SectionEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<SectionBlock>(),
		blockIndex: 0,
		blockIndexById: propType<Map<number, number>>(),
	},
	render: ({ form, block, blockIndex, blockIndexById }) => {
		const paragraphs = sortLexoPositions(
			block.children.filter((child) => child.blockType === "paragraph"),
			(child) => child.position
		);
		const entries = sortLexoPositions(
			block.children.filter((child) => child.blockType === "entry"),
			(child) => child.position
		);

		return (
			<TimelineSection title={block.content.title}>
				<div className="space-y-4">
					{block.content.isCustom && (
						<div className="max-w-sm">
							<form.AppField name={`blocks[${blockIndex}].content.title` as const}>
								{(field) => (
									<field.TextField
										className="px-0 font-medium text-muted-foreground text-xs uppercase tracking-wide"
										label="Sección"
									/>
								)}
							</form.AppField>
						</div>
					)}

					{block.content.layout === "freeform" &&
						paragraphs.map((paragraph) => {
							if (paragraph.blockType !== "paragraph") {
								return null;
							}
							const idx = blockIndexById.get(paragraph.id);
							if (idx === undefined) {
								return null;
							}
							return (
								<ParagraphEditor
									block={paragraph}
									blockIndex={idx}
									form={form}
									key={paragraph.id}
									placeholder="Escribe contenido de sección"
									toolbar="prose"
								/>
							);
						})}

					{block.content.layout === "entries" && (
						<ul className="space-y-4">
							{entries.map((entry) => {
								if (entry.blockType !== "entry") {
									return null;
								}
								const idx = blockIndexById.get(entry.id);
								if (idx === undefined) {
									return null;
								}
								return (
									<EntryEditor
										block={entry}
										blockIndex={idx}
										blockIndexById={blockIndexById}
										form={form}
										key={entry.id}
									/>
								);
							})}
						</ul>
					)}

					{block.content.layout === "skills" && (
						<SkillsEditor block={block} blockIndexById={blockIndexById} form={form} />
					)}
				</div>
			</TimelineSection>
		);
	},
});

"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { ENTRY_LABELS, getSectionKind } from "@stackk-career/schemas/api/resumes";
import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { TimelineSection } from "../timeline-section";
import { useCreateBlock } from "../use-block-mutations";
import { EntryEditor } from "./entry-editor";
import { ParagraphEditor } from "./paragraph-editor";
import { SkillsEditor } from "./skills-editor";

type SectionBlock = Extract<BlockNode, { blockType: "section" }>;

export const SectionEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<SectionBlock>(),
	},
	render: ({ form, block }) => {
		const params = Route.useParams();
		const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));
		const blockIndexById = useMemo(
			() => new Map(data.blocks.map((entry, idx) => [entry.id, idx] as const)),
			[data.blocks]
		);

		const createBlock = useCreateBlock({ form });
		const sectionKind = getSectionKind(block.content);
		const labels = ENTRY_LABELS[sectionKind];

		const paragraphs = sortLexoPositions(
			block.children.filter((child) => child.blockType === "paragraph"),
			(child) => child.position
		);
		const entries = sortLexoPositions(
			block.children.filter((child) => child.blockType === "entry"),
			(child) => child.position
		);

		const handleAddEntry = () => {
			createBlock
				.enqueue({
					resumeId: params.resumeId,
					parentBlockId: block.id,
					before: entries.at(-1)?.position ?? null,
					after: null,
					blockType: "entry",
					content: {
						title: "",
						subtitle: "",
						descriptor: "",
						descriptorFormat: "html",
						entryStyle: "standard",
						isCurrent: false,
						isRemote: false,
					},
				})
				.catch(() => undefined);
		};

		return (
			<TimelineSection title={block.content.title}>
				<div className="space-y-4 pl-3">
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
						<div className="space-y-3">
							<ul className="space-y-4">
								{entries.map((entry) => {
									if (entry.blockType !== "entry") {
										return null;
									}

									const idx = blockIndexById.get(entry.id);

									if (!idx) {
										return null;
									}

									return <EntryEditor block={entry} blockIndex={idx} form={form} key={entry.id} />;
								})}
							</ul>

							<Button disabled={createBlock.isPending} onClick={handleAddEntry} size="sm" type="button" variant="ghost">
								<PlusIcon />
								{labels.addCta}
							</Button>
						</div>
					)}

					{block.content.layout === "skills" && <SkillsEditor block={block} form={form} sectionKind={sectionKind} />}
				</div>
			</TimelineSection>
		);
	},
});

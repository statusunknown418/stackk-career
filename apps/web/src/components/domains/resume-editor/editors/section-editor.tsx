"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { ENTRY_LABELS, ENTRY_NOUNS, getSectionKind, isTimelineSectionKind } from "@stackk-career/schemas/api/resumes";
import { type SectionBlockNode, sortEntriesByTimeline } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { getSectionIcon } from "../section-icons";
import { TimelineSection } from "../timeline-section";
import { useCreateBlock } from "../use-block-mutations";
import { EntryEditor } from "./entry-editor";
import { ParagraphEditor } from "./paragraph-editor";
import { SkillsEditor } from "./skills-editor";

export const SectionEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<SectionBlockNode>(),
	},
	render: ({ form, block }) => {
		const params = Route.useParams();
		const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));
		const blockIndexById = useMemo(
			() => new Map(data.blocks.map((entry, idx) => [entry.id, idx] as const)),
			[data.blocks]
		);

		const createBlock = useCreateBlock({ form });
		const reduceMotion = useReducedMotion();
		const [focusedEntryId, setFocusedEntryId] = useState<number | null>(null);
		const sectionKind = getSectionKind(block.content);
		const labels = ENTRY_LABELS[sectionKind];
		const SectionIcon = getSectionIcon(sectionKind);
		const isTimelineKind = isTimelineSectionKind(sectionKind);

		const paragraphs = useMemo(
			() =>
				sortLexoPositions(
					block.children.filter((child) => child.blockType === "paragraph"),
					(child) => child.position
				),
			[block.children]
		);

		const rawEntries = useMemo(() => block.children.filter((child) => child.blockType === "entry"), [block.children]);

		const entries = useMemo(
			() =>
				isTimelineKind ? sortEntriesByTimeline(rawEntries) : sortLexoPositions(rawEntries, (child) => child.position),
			[rawEntries, isTimelineKind]
		);

		const handleAddEntry = () => {
			const trailingPosition = sortLexoPositions(rawEntries, (child) => child.position).at(-1)?.position ?? null;
			createBlock
				.enqueue({
					resumeId: params.resumeId,
					parentBlockId: block.id,
					before: trailingPosition,
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
				.then((created) => {
					if (created && typeof created === "object" && "id" in created) {
						setFocusedEntryId((created as { id: number }).id);
					}
				})
				.catch(() => undefined);
		};

		const entryTransition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const };

		return (
			<TimelineSection
				entryCount={block.content.layout === "entries" ? entries.length : undefined}
				entryNoun={ENTRY_NOUNS[sectionKind]}
				icon={SectionIcon}
				title={block.content.title}
			>
				<div className="space-y-4">
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
							<div>
								<AnimatePresence initial={false} mode="popLayout">
									{entries.map((entry) => {
										if (entry.blockType !== "entry") {
											return null;
										}

										const idx = blockIndexById.get(entry.id);

										if (!idx) {
											return null;
										}

										return (
											<motion.div
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
												initial={{ opacity: 0, y: -4 }}
												key={entry.id}
												layout="position"
												transition={entryTransition}
											>
												<EntryEditor
													block={entry}
													blockIndex={idx}
													form={form}
													shouldAutoFocus={entry.id === focusedEntryId}
												/>
											</motion.div>
										);
									})}
								</AnimatePresence>
							</div>

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

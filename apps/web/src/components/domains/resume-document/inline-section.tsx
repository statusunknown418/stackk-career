"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { ENTRY_LABELS, getSectionKind, isTimelineSectionKind } from "@stackk-career/schemas/api/resumes";
import { type SectionBlockNode, sortEntriesByTimeline } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getBlockKey } from "@/components/domains/resume-document/block-key-registry";
import { useCreateBlock, useDeleteBlock } from "@/components/domains/resume-editor/use-block-mutations";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { InlineEntry } from "./inline-entry";
import { InlineParagraph } from "./inline-paragraph";
import { InlineSkills } from "./inline-skills";
import { InlineTextEditor } from "./inline-text-editor";

export const InlineSection = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<SectionBlockNode>(),
		blockIndex: 0,
	},
	render: ({ form, block, blockIndex }) => {
		const params = Route.useParams();
		const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));
		const blockIndexById = useMemo(
			() => new Map(data.blocks.map((entry, idx) => [entry.id, idx] as const)),
			[data.blocks]
		);

		const createBlock = useCreateBlock({ form });
		const deleteBlock = useDeleteBlock({ form });

		const sectionKind = getSectionKind(block.content);
		const labels = ENTRY_LABELS[sectionKind];
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
			const leadingPosition = sortLexoPositions(rawEntries, (child) => child.position).at(0)?.position ?? null;
			createBlock.enqueue({
				resumeId: params.resumeId,
				parentBlockId: block.id,
				before: null,
				after: leadingPosition,
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
			});
		};

		const handleDeleteSection = () => {
			deleteBlock.mutate({ id: block.id, resumeId: params.resumeId });
		};

		return (
			<div className="group/section flex flex-col gap-3">
				<div className="flex items-center justify-between gap-2 border-b pb-1">
					<form.AppField name={`blocks[${blockIndex}].content.title` as const}>
						{(field) => (
							<InlineTextEditor
								onBlur={() => field.handleBlur()}
								onChange={(value) => field.handleChange(value)}
								placeholder="Título de sección"
								value={(field.state.value ?? "") as string}
								variant="heading"
							/>
						)}
					</form.AppField>
					<Button
						aria-label="Eliminar sección"
						className="opacity-0 transition-opacity group-focus-within/section:opacity-100 data-[pending=true]:opacity-100 [@media(hover:hover)]:group-hover/section:opacity-100"
						data-pending={deleteBlock.isPending}
						disabled={deleteBlock.isPending}
						onClick={handleDeleteSection}
						size="xs"
						type="button"
						variant="destructive-ghost"
					>
						{deleteBlock.isPending ? <Spinner className="size-4" /> : <TrashIcon />} Eliminar
					</Button>
				</div>

				{block.content.layout === "freeform" && (
					<div className="space-y-3">
						{paragraphs.map((paragraph) => {
							if (paragraph.blockType !== "paragraph") {
								return null;
							}
							const idx = blockIndexById.get(paragraph.id);
							if (idx === undefined) {
								return null;
							}
							return (
								<InlineParagraph
									blockIndex={idx}
									form={form}
									key={getBlockKey(paragraph.id)}
									placeholder="Escribe contenido de sección"
								/>
							);
						})}
					</div>
				)}

				{block.content.layout === "entries" && (
					<div className="space-y-4">
						{entries.map((entry) => {
							if (entry.blockType !== "entry") {
								return null;
							}
							const idx = blockIndexById.get(entry.id);
							if (idx === undefined) {
								return null;
							}
							return <InlineEntry block={entry} blockIndex={idx} form={form} key={getBlockKey(entry.id)} />;
						})}

						<Button
							className="rounded-full opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100 group-hover/section:opacity-100"
							disabled={createBlock.isPending}
							onClick={handleAddEntry}
							size="lg"
							type="button"
							variant="outline"
						>
							<PlusIcon />
							{labels.addCta}
						</Button>
					</div>
				)}

				{block.content.layout === "skills" && <InlineSkills block={block} form={form} sectionKind={sectionKind} />}
			</div>
		);
	},
});

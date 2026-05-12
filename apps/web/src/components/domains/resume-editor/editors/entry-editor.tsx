"use client";

import { TrashIcon } from "@phosphor-icons/react";
import {
	ENTRY_LABELS,
	getSectionKind,
	isTimelineSectionKind,
	type SectionKind,
} from "@stackk-career/schemas/api/resumes";
import { type EntryBlockNode, sectionContentSchema } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { RichTextField } from "../fields/rich-text-field";
import { useDeleteBlock } from "../use-block-mutations";
import { BulletEditor } from "./bullet-editor";
import { ParagraphEditor } from "./paragraph-editor";

export const EntryEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<EntryBlockNode>(),
		blockIndex: 0,
		shouldAutoFocus: false,
	},
	render: ({ form, block, blockIndex, shouldAutoFocus }) => {
		const params = Route.useParams();
		const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));

		const blockIndexById = useMemo(
			() => new Map(data.blocks.map((entry, idx) => [entry.id, idx] as const)),
			[data.blocks]
		);

		const deleteBlock = useDeleteBlock({ form });
		const rootRef = useRef<HTMLDivElement>(null);

		const sectionKind: SectionKind = useMemo(() => {
			if (block.parentBlockId === null) {
				return "custom";
			}

			const parent = data.blocks.find((candidate) => candidate.id === block.parentBlockId);
			if (!parent || parent.blockType !== "section") {
				return "custom";
			}

			const parsed = sectionContentSchema.safeParse(parent.content);

			return parsed.success ? getSectionKind(parsed.data) : "custom";
		}, [block.parentBlockId, data.blocks]);

		const labels = ENTRY_LABELS[sectionKind];
		const showRailDot = isTimelineSectionKind(sectionKind);
		const isCurrent = block.content.isCurrent ?? false;

		useEffect(() => {
			if (!shouldAutoFocus) {
				return;
			}
			const node = rootRef.current;
			if (!node) {
				return;
			}
			node.scrollIntoView({ behavior: "smooth", block: "center" });
			const firstInput = node.querySelector<HTMLInputElement>("input:not([type='checkbox']):not([disabled])");
			firstInput?.focus();
		}, [shouldAutoFocus]);

		const bullets = sortLexoPositions(
			block.children.filter((child) => child.blockType === "bullet"),
			(child) => child.position
		);

		const paragraphs = sortLexoPositions(
			block.children.filter((child) => child.blockType === "paragraph"),
			(child) => child.position
		);

		const handleRemove = () => {
			deleteBlock.mutate({ id: block.id, resumeId: params.resumeId });
		};

		return (
			<article
				className="group relative rounded-md transition-colors duration-150 focus-within:bg-muted/30 [@media(hover:hover)]:hover:bg-muted/20"
				data-current={isCurrent}
				ref={rootRef}
			>
				<div className="absolute -top-2 -right-2 opacity-0 transition-opacity group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
					<Button
						aria-label="Eliminar entrada"
						onClick={handleRemove}
						size="sm"
						type="button"
						variant="destructive-outline"
					>
						<TrashIcon /> Borrar
					</Button>
				</div>

				<div className="flex gap-3 px-3 py-3">
					{showRailDot && (
						<div aria-hidden="true" className="relative w-2 flex-none">
							<span className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border/60" />
							<span className="absolute top-5 left-1/2 size-2 -translate-x-1/2 rounded-full border border-muted-foreground/40 bg-background transition-colors group-focus-within:border-primary group-focus-within:bg-primary group-data-[current]:border-foreground group-data-[current]:bg-foreground" />
						</div>
					)}
					<div className="min-w-0 flex-1 space-y-4">
						<div className="grid gap-3 md:grid-cols-2">
							<form.AppField name={`blocks[${blockIndex}].content.title` as const}>
								{(field) => <field.TextField label={labels.title} />}
							</form.AppField>
							<form.AppField name={`blocks[${blockIndex}].content.subtitle` as const}>
								{(field) => <field.TextField label={labels.subtitle} />}
							</form.AppField>
						</div>

						<div
							className={
								sectionKind === "experience"
									? "grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr_auto]"
									: "grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
							}
						>
							<form.AppField name={`blocks[${blockIndex}].content.location` as const}>
								{(field) => <field.TextField label="Ubicación" />}
							</form.AppField>

							{sectionKind === "experience" && (
								<div className="flex items-end pb-1.5">
									<form.AppField name={`blocks[${blockIndex}].content.isRemote` as const}>
										{(field) => <field.CheckboxField label="Remoto" />}
									</form.AppField>
								</div>
							)}

							<form.AppField name={`blocks[${blockIndex}].content.startDate` as const}>
								{(field) => <field.MonthField label="Inicio" />}
							</form.AppField>

							<form.Subscribe
								selector={(state) => state.values.blocks[blockIndex]?.content as EntryBlockNode["content"]}
							>
								{(content) => (
									<form.AppField name={`blocks[${blockIndex}].content.endDate` as const}>
										{(field) => <field.MonthField disabled={content?.isCurrent ?? false} emptyAsNull label="Fin" />}
									</form.AppField>
								)}
							</form.Subscribe>

							<div className="flex items-end pb-1.5">
								<form.AppField name={`blocks[${blockIndex}].content.isCurrent` as const}>
									{(field) => <field.CheckboxField label="Actual" />}
								</form.AppField>
							</div>
						</div>

						<div className="space-y-2">
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Descripción</p>
							<form.AppField name={`blocks[${blockIndex}].content.descriptor` as const}>
								{(textField) => (
									<form.AppField name={`blocks[${blockIndex}].content.descriptorFormat` as const}>
										{(formatField) => (
											<RichTextField
												blockId={block.id}
												formatField={formatField}
												placeholder="Describe alcance, contexto o impacto"
												textField={textField}
												toolbar="prose"
											/>
										)}
									</form.AppField>
								)}
							</form.AppField>
						</div>

						{bullets.length > 0 && (
							<ul className="space-y-2 pl-3">
								{bullets.map((bullet) => {
									if (bullet.blockType !== "bullet") {
										return null;
									}
									const idx = blockIndexById.get(bullet.id);
									if (idx === undefined) {
										return null;
									}
									return <BulletEditor block={bullet} blockIndex={idx} form={form} key={bullet.id} />;
								})}
							</ul>
						)}

						{paragraphs.length > 0 && (
							<div className="space-y-2">
								{paragraphs.map((paragraph) => {
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
											placeholder="Añade contexto adicional"
											toolbar="prose"
										/>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</article>
		);
	},
});

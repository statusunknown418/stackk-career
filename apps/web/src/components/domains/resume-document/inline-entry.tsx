"use client";

import { TrashIcon } from "@phosphor-icons/react";
import {
	ENTRY_LABELS,
	getSectionKind,
	isTimelineSectionKind,
	type SectionKind,
} from "@stackk-career/schemas/api/resumes";
import { type EntryBlockNode, proseContentToHtml, sectionContentSchema } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getBlockKey } from "@/components/domains/resume-document/block-key-registry";
import { useDeleteBlock } from "@/components/domains/resume-editor/use-block-mutations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { InlineBullet } from "./inline-bullet";
import { InlineDateTrigger } from "./inline-date-trigger";
import { InlineParagraph } from "./inline-paragraph";
import { InlineTextEditor } from "./inline-text-editor";

export const InlineEntry = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<EntryBlockNode>(),
		blockIndex: 0,
	},
	render: ({ form, block, blockIndex }) => {
		const params = Route.useParams();
		const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));

		const blockIndexById = useMemo(
			() => new Map(data.blocks.map((entry, idx) => [entry.id, idx] as const)),
			[data.blocks]
		);

		const deleteBlock = useDeleteBlock({ form });

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
		const isExperience = sectionKind === "experience";

		const bullets = sortLexoPositions(
			block.children.filter((child) => child.blockType === "bullet"),
			(child) => child.position
		);

		const paragraphs = sortLexoPositions(
			block.children.filter((child) => child.blockType === "paragraph"),
			(child) => child.position
		);

		const handleRemoveEntry = () => {
			deleteBlock.mutate({ id: block.id, resumeId: params.resumeId });
		};

		return (
			<article className={"group/entry relative flex gap-3"} data-block-id={block.id} data-current={isCurrent}>
				{showRailDot && (
					<div aria-hidden="true" className="relative w-2 flex-none">
						<span className="absolute -top-3 -bottom-3 left-1/2 w-px -translate-x-1/2 bg-border/60" />
						<span className="absolute top-3 left-1/2 size-2 -translate-x-1/2 rounded-full border border-muted-foreground/40 bg-background transition-colors group-focus-within/entry:border-primary group-focus-within/entry:bg-primary group-data-current/entry:border-foreground group-data-current/entry:bg-foreground" />
					</div>
				)}

				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1">
							<form.AppField name={`blocks[${blockIndex}].content.title` as const}>
								{(field) => (
									<InlineTextEditor
										onBlur={() => field.handleBlur()}
										onChange={(value) => field.handleChange(value)}
										placeholder={labels.title}
										value={(field.state.value ?? "") as string}
										variant="subtitle"
									/>
								)}
							</form.AppField>
							<form.AppField name={`blocks[${blockIndex}].content.subtitle` as const}>
								{(field) => (
									<InlineTextEditor
										onBlur={() => field.handleBlur()}
										onChange={(value) => field.handleChange(value)}
										placeholder={labels.subtitle}
										value={(field.state.value ?? "") as string}
										variant="plain"
									/>
								)}
							</form.AppField>
						</div>

						<Button
							aria-label="Eliminar entrada"
							className="opacity-0 transition-opacity group-focus-within/entry:opacity-100 [@media(hover:hover)]:group-hover/entry:opacity-100"
							onClick={handleRemoveEntry}
							size="icon-sm"
							type="button"
							variant="destructive-ghost"
						>
							<TrashIcon />
						</Button>
					</div>

					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
						<form.AppField name={`blocks[${blockIndex}].content.location` as const}>
							{(field) => (
								<InlineTextEditor
									onBlur={() => field.handleBlur()}
									onChange={(value) => field.handleChange(value)}
									placeholder="Ubicación"
									value={(field.state.value ?? "") as string}
									variant="plain"
								/>
							)}
						</form.AppField>

						{isExperience && (
							<form.AppField name={`blocks[${blockIndex}].content.isRemote` as const}>
								{(field) => (
									<label
										className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 hover:bg-accent/40"
										htmlFor={`blocks[${blockIndex}].content.isRemote`}
									>
										<Checkbox
											checked={Boolean(field.state.value)}
											id={`blocks[${blockIndex}].content.isRemote`}
											onBlur={field.handleBlur}
											onCheckedChange={(next) => field.handleChange(next === true)}
										/>
										<span>Remoto</span>
									</label>
								)}
							</form.AppField>
						)}

						<span aria-hidden="true">·</span>

						<form.AppField name={`blocks[${blockIndex}].content.startDate` as const}>
							{() => (
								<InlineDateTrigger
									disableFuture={sectionKind === "experience" || sectionKind === "education"}
									placeholder="Inicio"
								/>
							)}
						</form.AppField>

						<span aria-hidden="true">–</span>

						<form.Subscribe selector={(state) => state.values.blocks[blockIndex]?.content as EntryBlockNode["content"]}>
							{(content) => (
								<form.AppField name={`blocks[${blockIndex}].content.endDate` as const}>
									{() => <InlineDateTrigger disabled={content?.isCurrent ?? false} emptyAsNull placeholder="Fin" />}
								</form.AppField>
							)}
						</form.Subscribe>

						<form.AppField name={`blocks[${blockIndex}].content.isCurrent` as const}>
							{(field) => (
								<label
									className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 hover:bg-accent/40"
									htmlFor={`blocks[${blockIndex}].content.isCurrent`}
								>
									<Checkbox
										checked={Boolean(field.state.value)}
										onBlur={field.handleBlur}
										onCheckedChange={(next) => field.handleChange(next === true)}
									/>
									<span>Actual</span>
								</label>
							)}
						</form.AppField>
					</div>

					<div className="pt-1">
						<form.AppField name={`blocks[${blockIndex}].content.descriptor` as const}>
							{(textField) => (
								<form.AppField name={`blocks[${blockIndex}].content.descriptorFormat` as const}>
									{(formatField) => {
										const textValue = (textField.state.value ?? "") as string;
										const formatValue = (formatField.state.value ?? "html") as "html" | "plain";
										const html = proseContentToHtml(textValue, formatValue);
										const applyDescriptor = (nextHtml: string) => {
											textField.handleChange(nextHtml);
											if (formatValue !== "html") {
												formatField.handleChange("html");
											}
										};
										return (
											<InlineTextEditor
												onBlur={() => textField.handleBlur()}
												onChange={(value) => {
													textField.handleChange(value);
													if (formatValue !== "html") {
														formatField.handleChange("html");
													}
												}}
												placeholder="Describe alcance, contexto o impacto"
												suggestion={{
													input: {
														resumeId: params.resumeId,
														blockId: block.id,
														blockType: "entry",
														field: "descriptor",
														existingContent: html,
													},
													onApply: applyDescriptor,
												}}
												value={html}
												variant="prose"
											/>
										);
									}}
								</form.AppField>
							)}
						</form.AppField>
					</div>

					{bullets.length > 0 && (
						<ul className="list-disc space-y-1 pl-5">
							{bullets.map((bullet) => {
								if (bullet.blockType !== "bullet") {
									return null;
								}
								const idx = blockIndexById.get(bullet.id);
								if (idx === undefined) {
									return null;
								}
								return (
									<InlineBullet
										blockIndex={idx}
										form={form}
										key={getBlockKey(bullet.id)}
										onEnterEmpty={() => deleteBlock.mutate({ id: bullet.id, resumeId: params.resumeId })}
									/>
								);
							})}
						</ul>
					)}

					{paragraphs.length > 0 && (
						<div className="space-y-1">
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
										placeholder="Añade contexto adicional"
									/>
								);
							})}
						</div>
					)}
				</div>
			</article>
		);
	},
});

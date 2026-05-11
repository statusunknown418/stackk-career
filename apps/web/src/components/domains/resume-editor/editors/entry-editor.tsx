"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { RichTextField } from "../fields/rich-text-field";
import { BulletEditor } from "./bullet-editor";
import { ParagraphEditor } from "./paragraph-editor";

type EntryBlock = Extract<BlockNode, { blockType: "entry" }>;

export const EntryEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<EntryBlock>(),
		blockIndex: 0,
		blockIndexById: propType<Map<number, number>>(),
	},
	render: ({ form, block, blockIndex, blockIndexById }) => {
		const bullets = sortLexoPositions(
			block.children.filter((child) => child.blockType === "bullet"),
			(child) => child.position
		);
		const paragraphs = sortLexoPositions(
			block.children.filter((child) => child.blockType === "paragraph"),
			(child) => child.position
		);

		return (
			<li className="space-y-4">
				<div className="grid gap-3 md:grid-cols-2">
					<form.AppField name={`blocks[${blockIndex}].content.title` as const}>
						{(field) => <field.TextField className="px-0 font-semibold text-base" label="Título" />}
					</form.AppField>
					<form.AppField name={`blocks[${blockIndex}].content.subtitle` as const}>
						{(field) => <field.TextField className="px-0 text-muted-foreground" label="Subtítulo" />}
					</form.AppField>
				</div>

				<div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
					<form.AppField name={`blocks[${blockIndex}].content.location` as const}>
						{(field) => <field.TextField label="Ubicación" />}
					</form.AppField>
					<form.AppField name={`blocks[${blockIndex}].content.startDate` as const}>
						{(field) => <field.MonthField label="Inicio" />}
					</form.AppField>
					<form.Subscribe selector={(state) => state.values.blocks[blockIndex]?.content as EntryBlock["content"]}>
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
			</li>
		);
	},
});

"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { RichTextField } from "../fields/rich-text-field";
import type { ResumeAutosave } from "../use-resume-autosave";
import { BulletEditor } from "./bullet-editor";
import { ParagraphEditor } from "./paragraph-editor";

type EntryBlock = Extract<BlockNode, { blockType: "entry" }>;

export const EntryEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		autosave: propType<ResumeAutosave>(),
		block: propType<EntryBlock>(),
		blockIndex: 0,
		blockIndexById: propType<Map<number, number>>(),
	},
	render: ({ form, autosave, block, blockIndex, blockIndexById }) => {
		const blockListeners = {
			onBlur: () => autosave.flushBlockSave(block.id),
			onChange: () => autosave.queueBlockSave(block.id),
		};

		const bullets = sortLexoPositions(
			block.children.filter((child) => child.blockType === "bullet"),
			(child) => child.position
		);
		const paragraphs = sortLexoPositions(
			block.children.filter((child) => child.blockType === "paragraph"),
			(child) => child.position
		);

		return (
			<li className="space-y-3 pl-2">
				<div className="grid gap-3 md:grid-cols-2">
					<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.title` as const}>
						{(field) => <field.TextField className="px-0 font-semibold text-base" label="Título" />}
					</form.AppField>
					<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.subtitle` as const}>
						{(field) => <field.TextField className="px-0 text-muted-foreground" label="Subtítulo" />}
					</form.AppField>
					<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.location` as const}>
						{(field) => <field.TextField label="Ubicación" />}
					</form.AppField>
					<div className="grid grid-cols-2 gap-3">
						<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.startDate` as const}>
							{(field) => <field.MonthField label="Inicio" />}
						</form.AppField>
						<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.endDate` as const}>
							{(field) => <field.MonthField emptyAsNull label="Fin" />}
						</form.AppField>
					</div>
				</div>

				<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.isCurrent` as const}>
					{(field) => <field.CheckboxField label="Posición actual" />}
				</form.AppField>

				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Descripción</p>
					<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.descriptor` as const}>
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

				{bullets.length > 0 ? (
					<ul className="space-y-2 pl-3">
						{bullets.map((bullet) => {
							if (bullet.blockType !== "bullet") {
								return null;
							}
							const idx = blockIndexById.get(bullet.id);
							if (idx === undefined) {
								return null;
							}
							return <BulletEditor autosave={autosave} block={bullet} blockIndex={idx} form={form} key={bullet.id} />;
						})}
					</ul>
				) : null}

				{paragraphs.length > 0 ? (
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
									autosave={autosave}
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
				) : null}
			</li>
		);
	},
});

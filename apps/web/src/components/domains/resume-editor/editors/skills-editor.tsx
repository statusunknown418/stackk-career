"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import type { ResumeAutosave } from "../use-resume-autosave";

type SectionBlock = Extract<BlockNode, { blockType: "section" }>;

const proficiencyOptions = [
	"basic",
	"conversational",
	"fluent",
	"native",
	"beginner",
	"intermediate",
	"advanced",
	"expert",
] as const;

const categoryOptions = ["technical", "languages", "laboratory", "interests", "certifications", "other"] as const;

export const SkillsEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		autosave: propType<ResumeAutosave>(),
		block: propType<SectionBlock>(),
		blockIndexById: propType<Map<number, number>>(),
	},
	render: ({ form, autosave, block, blockIndexById }) => {
		const lines = sortLexoPositions(
			block.children.filter((child) => child.blockType === "skill_line"),
			(child) => child.position
		);

		return (
			<div className="space-y-3">
				{lines.map((line) => {
					if (line.blockType !== "skill_line") {
						return null;
					}

					const lineIndex = blockIndexById.get(line.id);

					if (lineIndex === undefined) {
						return null;
					}

					const lineListeners = {
						onBlur: () => autosave.flushBlockSave(line.id),
						onChange: () => autosave.queueBlockSave(line.id),
					};

					const items = sortLexoPositions(
						line.children.filter((child) => child.blockType === "skill_item"),
						(child) => child.position
					);

					return (
						<div className="space-y-3 pl-2" key={line.id}>
							<div className="grid gap-3 md:grid-cols-2">
								<form.AppField listeners={lineListeners} name={`blocks[${lineIndex}].content.label` as const}>
									{(field) => (
										<field.TextField className="px-0 font-medium text-sm uppercase tracking-wide" label="Categoría" />
									)}
								</form.AppField>
								<form.AppField listeners={lineListeners} name={`blocks[${lineIndex}].content.category` as const}>
									{(field) => <field.SelectField label="Tipo" options={categoryOptions} />}
								</form.AppField>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								{items.map((item) => {
									if (item.blockType !== "skill_item") {
										return null;
									}

									const itemIndex = blockIndexById.get(item.id);

									if (itemIndex === undefined) {
										return null;
									}

									const itemListeners = {
										onBlur: () => autosave.flushBlockSave(item.id),
										onChange: () => autosave.queueBlockSave(item.id),
									};

									return (
										<div className="grid gap-2 rounded-lg border border-dashed p-3" key={item.id}>
											<form.AppField listeners={itemListeners} name={`blocks[${itemIndex}].content.value` as const}>
												{(field) => <field.TextField label="Habilidad" />}
											</form.AppField>
											<form.AppField
												listeners={itemListeners}
												name={`blocks[${itemIndex}].content.proficiency` as const}
											>
												{(field) => <field.SelectField emptyAsUndefined label="Nivel" options={proficiencyOptions} />}
											</form.AppField>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		);
	},
});

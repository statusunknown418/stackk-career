"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";

type SectionBlock = Extract<BlockNode, { blockType: "section" }>;

const proficiencyOptions = [
	{ label: "Básico", value: "basic" },
	{ label: "Conversacional", value: "conversational" },
	{ label: "Fluido", value: "fluent" },
	{ label: "Nativo", value: "native" },
	{ label: "Principiante", value: "beginner" },
	{ label: "Intermedio", value: "intermediate" },
	{ label: "Avanzado", value: "advanced" },
	{ label: "Experto", value: "expert" },
] as const;

const categoryOptions = [
	{ label: "Técnicas", value: "technical" },
	{ label: "Idiomas", value: "languages" },
	{ label: "Laboratorio", value: "laboratory" },
	{ label: "Intereses", value: "interests" },
	{ label: "Certificaciones", value: "certifications" },
	{ label: "Otro", value: "other" },
] as const;

export const SkillsEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<SectionBlock>(),
		blockIndexById: propType<Map<number, number>>(),
	},
	render: ({ form, block, blockIndexById }) => {
		const lines = sortLexoPositions(
			block.children.filter((child) => child.blockType === "skill_line"),
			(child) => child.position
		);

		return (
			<div className="space-y-4">
				{lines.map((line) => {
					if (line.blockType !== "skill_line") {
						return null;
					}

					const lineIndex = blockIndexById.get(line.id);

					if (lineIndex === undefined) {
						return null;
					}

					const items = sortLexoPositions(
						line.children.filter((child) => child.blockType === "skill_item"),
						(child) => child.position
					);

					return (
						<div className="space-y-3" key={line.id}>
							<div className="grid gap-3 md:grid-cols-2">
								<form.AppField name={`blocks[${lineIndex}].content.label` as const}>
									{(field) => <field.TextField label="Categoría" />}
								</form.AppField>
								<form.AppField name={`blocks[${lineIndex}].content.category` as const}>
									{(field) => <field.SelectField label="Tipo" options={categoryOptions} />}
								</form.AppField>
							</div>

							<div className="grid gap-2 md:grid-cols-2">
								{items.map((item) => {
									if (item.blockType !== "skill_item") {
										return null;
									}

									const itemIndex = blockIndexById.get(item.id);

									if (itemIndex === undefined) {
										return null;
									}

									return (
										<div className="grid gap-2 rounded-lg bg-muted/40 px-3 py-2 md:grid-cols-[1fr_140px]" key={item.id}>
											<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
												{(field) => <field.TextField label="Habilidad" />}
											</form.AppField>
											<form.AppField name={`blocks[${itemIndex}].content.proficiency` as const}>
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

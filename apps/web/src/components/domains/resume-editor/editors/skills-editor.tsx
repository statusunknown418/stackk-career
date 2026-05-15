"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import {
	type BlockNode,
	buildLabeledOptions,
	SKILL_CATEGORIES,
	SKILL_CATEGORY_LABELS,
	SKILL_PROFICIENCY_LABELS,
	type SkillProficiency,
} from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { log } from "evlog/client";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Frame, FrameFooter, FrameHeader, FramePanel } from "@/components/ui/frame";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { getBlockKey } from "../block-key-registry";
import { useCreateBlock, useDeleteBlock } from "../use-block-mutations";

type SectionBlock = Extract<BlockNode, { blockType: "section" }>;

const categoryOptions = buildLabeledOptions(SKILL_CATEGORIES, SKILL_CATEGORY_LABELS);

const SKILL_PROFICIENCIES: readonly SkillProficiency[] = ["beginner", "intermediate", "advanced", "expert"];
const LANGUAGE_PROFICIENCIES: readonly SkillProficiency[] = ["basic", "conversational", "fluent", "native"];

const skillProficiencyOptions = buildLabeledOptions(SKILL_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);
const languageProficiencyOptions = buildLabeledOptions(LANGUAGE_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);

export const SkillsEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<SectionBlock>(),
		sectionKind: propType<SectionKind>(),
	},
	render: ({ form, block, sectionKind }) => {
		const params = Route.useParams();
		const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));
		const blockIndexById = useMemo(
			() => new Map(data.blocks.map((entry, idx) => [entry.id, idx] as const)),
			[data.blocks]
		);

		const createBlock = useCreateBlock({ form });
		const deleteBlock = useDeleteBlock({ form });

		const lines = sortLexoPositions(
			block.children.filter((child) => child.blockType === "skill_line"),
			(child) => child.position
		);

		const isLanguages = sectionKind === "languages";
		const proficiencyOptions = isLanguages ? languageProficiencyOptions : skillProficiencyOptions;
		const addItemLabel = isLanguages ? "Agregar idioma" : "Añadir item";
		const itemLabel = isLanguages ? "Idioma" : "Habilidad";

		const handleAddCategory = () => {
			createBlock
				.enqueue({
					resumeId: params.resumeId,
					parentBlockId: block.id,
					before: lines.at(-1)?.position ?? null,
					after: null,
					blockType: "skill_line",
					content: {
						label: isLanguages ? "Idiomas" : "Nueva categoría",
						category: isLanguages ? "languages" : "other",
					},
				})
				.catch((error) =>
					log.error({ scope: "resume_editor", message: "Something happened creating a category", error })
				);
		};

		if (isLanguages) {
			const primaryLine = lines[0];
			if (!primaryLine || primaryLine.blockType !== "skill_line") {
				return null;
			}
			const items = sortLexoPositions(
				primaryLine.children.filter((child) => child.blockType === "skill_item"),
				(child) => child.position
			);
			const handleAddItem = () => {
				createBlock
					.enqueue({
						resumeId: params.resumeId,
						parentBlockId: primaryLine.id,
						before: items.at(-1)?.position ?? null,
						after: null,
						blockType: "skill_item",
						content: {
							value: "",
						},
					})
					.catch((error) =>
						log.error({ scope: "resume_editor", message: "Something happened creating a skill", error })
					);
			};

			return (
				<div className="space-y-3">
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
								<div
									className="group/item relative grid gap-2 rounded-lg bg-muted/40 px-3 py-2 md:grid-cols-[1fr_160px_auto]"
									key={getBlockKey(item.id)}
								>
									<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
										{(field) => <field.TextField label={itemLabel} />}
									</form.AppField>
									<form.AppField name={`blocks[${itemIndex}].content.proficiency` as const}>
										{(field) => <field.SelectField emptyAsUndefined label="Nivel" options={proficiencyOptions} />}
									</form.AppField>

									<div className="flex items-end pb-1.5">
										<Button
											aria-label="Eliminar idioma"
											className="opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100"
											onClick={() => deleteBlock.mutate({ id: item.id, resumeId: params.resumeId })}
											size="icon-sm"
											type="button"
											variant="ghost"
										>
											<TrashIcon />
										</Button>
									</div>
								</div>
							);
						})}
					</div>

					<Button disabled={createBlock.isPending} onClick={handleAddItem} size="sm" type="button" variant="ghost">
						<PlusIcon />
						{addItemLabel}
					</Button>
				</div>
			);
		}

		return (
			<div className="space-y-6">
				<div className="space-y-3">
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

						const handleAddItem = () => {
							createBlock
								.enqueue({
									resumeId: params.resumeId,
									parentBlockId: line.id,
									before: items.at(-1)?.position ?? null,
									after: null,
									blockType: "skill_item",
									content: {
										value: "",
									},
								})
								.catch((error) =>
									log.error({ scope: "resume_editor", message: "Something happened creating a skill", error })
								);
						};

						return (
							<Frame className="group/line" key={getBlockKey(line.id)}>
								<FrameHeader className="flex-row items-end gap-2">
									<div className="grid flex-1 gap-3 md:grid-cols-2">
										<form.AppField name={`blocks[${lineIndex}].content.category` as const}>
											{(field) => <field.SelectField options={categoryOptions} />}
										</form.AppField>
									</div>

									<Button
										aria-label="Eliminar categoría"
										className="opacity-0 transition-opacity group-focus-within/line:opacity-100 group-hover/line:opacity-100"
										onClick={() => deleteBlock.mutate({ id: line.id, resumeId: params.resumeId })}
										size="icon-sm"
										type="button"
										variant="ghost"
									>
										<TrashIcon />
									</Button>
								</FrameHeader>

								<FramePanel>
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
												<div
													className="group/item relative grid gap-2 rounded-lg bg-muted/40 px-3 py-2 md:grid-cols-[1fr_160px_auto]"
													key={getBlockKey(item.id)}
												>
													<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
														{(field) => <field.TextField label={itemLabel} />}
													</form.AppField>
													<form.AppField name={`blocks[${itemIndex}].content.proficiency` as const}>
														{(field) => (
															<field.SelectField emptyAsUndefined label="Nivel" options={proficiencyOptions} />
														)}
													</form.AppField>
													<div className="flex items-end pb-1.5">
														<Button
															aria-label="Eliminar habilidad"
															className="opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100"
															onClick={() => deleteBlock.mutate({ id: item.id, resumeId: params.resumeId })}
															size="icon-sm"
															type="button"
															variant="ghost"
														>
															<TrashIcon />
														</Button>
													</div>
												</div>
											);
										})}
									</div>
								</FramePanel>

								<FrameFooter>
									<Button
										disabled={createBlock.isPending}
										onClick={handleAddItem}
										size="sm"
										type="button"
										variant="ghost-muted"
									>
										<PlusIcon />
										{addItemLabel}
									</Button>
								</FrameFooter>
							</Frame>
						);
					})}
				</div>

				<Button
					className="w-max"
					disabled={createBlock.isPending}
					onClick={handleAddCategory}
					type="button"
					variant="ghost"
				>
					<PlusIcon />
					Agregar categoría
				</Button>
			</div>
		);
	},
});

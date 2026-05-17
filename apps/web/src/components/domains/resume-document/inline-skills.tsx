"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import {
	type BlockNode,
	buildLabeledOptions,
	SKILL_CATEGORIES,
	SKILL_CATEGORY_LABELS,
	SKILL_PROFICIENCY_LABELS,
	type SkillCategory,
	type SkillProficiency,
} from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getBlockKey } from "@/components/domains/resume-editor/block-key-registry";
import { useCreateBlock, useDeleteBlock } from "@/components/domains/resume-editor/use-block-mutations";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { InlineTextEditor } from "./inline-text-editor";

type SectionBlock = Extract<BlockNode, { blockType: "section" }>;

const categoryOptions = buildLabeledOptions(SKILL_CATEGORIES, SKILL_CATEGORY_LABELS);

const SKILL_PROFICIENCIES: readonly SkillProficiency[] = ["beginner", "intermediate", "advanced", "expert"];
const LANGUAGE_PROFICIENCIES: readonly SkillProficiency[] = ["basic", "conversational", "fluent", "native"];

const skillProficiencyOptions = buildLabeledOptions(SKILL_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);
const languageProficiencyOptions = buildLabeledOptions(LANGUAGE_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);

export const InlineSkills = withForm({
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
		const itemPlaceholder = isLanguages ? "Idioma" : "Habilidad";

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
				.catch(() => undefined);
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
						content: { value: "" },
					})
					.catch(() => undefined);
			};

			return (
				<div className="space-y-2">
					<ul className="flex flex-wrap gap-x-4 gap-y-1">
						{items.map((item) => {
							if (item.blockType !== "skill_item") {
								return null;
							}
							const itemIndex = blockIndexById.get(item.id);
							if (itemIndex === undefined) {
								return null;
							}
							return (
								<li className="group/item flex items-center gap-1" key={getBlockKey(item.id)}>
									<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
										{(field) => (
											<InlineTextEditor
												onBlur={() => field.handleBlur()}
												onChange={(value) => field.handleChange(value)}
												placeholder={itemPlaceholder}
												value={(field.state.value ?? "") as string}
												variant="plain"
											/>
										)}
									</form.AppField>
									<form.AppField name={`blocks[${itemIndex}].content.proficiency` as const}>
										{(field) => (
											<Select
												items={proficiencyOptions}
												onValueChange={(next) =>
													field.handleChange(next === "" || next === null ? undefined : (next as SkillProficiency))
												}
												value={(field.state.value ?? "") as string}
											>
												<SelectTrigger aria-label="Nivel" onBlur={field.handleBlur} size="sm">
													<SelectValue placeholder="Nivel" />
												</SelectTrigger>
												<SelectPopup>
													{proficiencyOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectPopup>
											</Select>
										)}
									</form.AppField>
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
								</li>
							);
						})}
					</ul>

					<Button disabled={createBlock.isPending} onClick={handleAddItem} size="sm" type="button" variant="ghost">
						<PlusIcon />
						{addItemLabel}
					</Button>
				</div>
			);
		}

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

					const handleAddItem = () => {
						createBlock
							.enqueue({
								resumeId: params.resumeId,
								parentBlockId: line.id,
								before: items.at(-1)?.position ?? null,
								after: null,
								blockType: "skill_item",
								content: { value: "" },
							})
							.catch(() => undefined);
					};

					return (
						<div className="group/line flex flex-col gap-1" key={getBlockKey(line.id)}>
							<div className="flex items-center justify-between gap-2">
								<form.AppField name={`blocks[${lineIndex}].content.label` as const}>
									{(field) => (
										<InlineTextEditor
											onBlur={() => field.handleBlur()}
											onChange={(value) => field.handleChange(value)}
											placeholder="Categoría"
											value={(field.state.value ?? "") as string}
											variant="subtitle"
										/>
									)}
								</form.AppField>
								<div className="flex items-center gap-1">
									<form.AppField name={`blocks[${lineIndex}].content.category` as const}>
										{(field) => (
											<Select
												items={categoryOptions}
												onValueChange={(next) => field.handleChange(next as SkillCategory)}
												value={(field.state.value ?? "") as string}
											>
												<SelectTrigger aria-label="Categoría" onBlur={field.handleBlur} size="sm">
													<SelectValue />
												</SelectTrigger>
												<SelectPopup>
													{categoryOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectPopup>
											</Select>
										)}
									</form.AppField>
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
								</div>
							</div>

							<ul className="flex flex-wrap gap-x-4 gap-y-1 pl-1">
								{items.map((item) => {
									if (item.blockType !== "skill_item") {
										return null;
									}
									const itemIndex = blockIndexById.get(item.id);
									if (itemIndex === undefined) {
										return null;
									}
									return (
										<li className="group/item flex items-center gap-1" key={getBlockKey(item.id)}>
											<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
												{(field) => (
													<InlineTextEditor
														onBlur={() => field.handleBlur()}
														onChange={(value) => field.handleChange(value)}
														placeholder={itemPlaceholder}
														value={(field.state.value ?? "") as string}
														variant="plain"
													/>
												)}
											</form.AppField>
											<form.AppField name={`blocks[${itemIndex}].content.proficiency` as const}>
												{(field) => (
													<Select
														items={proficiencyOptions}
														onValueChange={(next) =>
															field.handleChange(next === "" || next === null ? undefined : (next as SkillProficiency))
														}
														value={(field.state.value ?? "") as string}
													>
														<SelectTrigger aria-label="Nivel" onBlur={field.handleBlur} size="sm">
															<SelectValue placeholder="Nivel" />
														</SelectTrigger>
														<SelectPopup>
															{proficiencyOptions.map((option) => (
																<SelectItem key={option.value} value={option.value}>
																	{option.label}
																</SelectItem>
															))}
														</SelectPopup>
													</Select>
												)}
											</form.AppField>
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
										</li>
									);
								})}
							</ul>

							<div className="opacity-0 transition-opacity group-focus-within/line:opacity-100 group-hover/line:opacity-100">
								<Button
									disabled={createBlock.isPending}
									onClick={handleAddItem}
									size="sm"
									type="button"
									variant="ghost"
								>
									<PlusIcon />
									{addItemLabel}
								</Button>
							</div>
						</div>
					);
				})}

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

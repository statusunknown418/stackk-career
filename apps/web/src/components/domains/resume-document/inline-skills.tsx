"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import {
	buildLabeledOptions,
	type SectionBlockNode,
	SKILL_PROFICIENCY_LABELS,
	type SkillProficiency,
} from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import { getBlockKey } from "@/components/domains/resume-document/block-key-registry";
import { useCreateBlock, useDeleteBlock } from "@/components/domains/resume-editor/use-block-mutations";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { InlineTextEditor } from "./inline-text-editor";

const SKILL_PROFICIENCIES: readonly SkillProficiency[] = ["beginner", "intermediate", "advanced", "expert"];
const LANGUAGE_PROFICIENCIES: readonly SkillProficiency[] = ["basic", "conversational", "fluent", "native"];

const skillProficiencyOptions = buildLabeledOptions(SKILL_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);
const languageProficiencyOptions = buildLabeledOptions(LANGUAGE_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);

interface SkillChipProps {
	children: ReactNode;
	deleteLabel: string;
	onDelete: () => void;
}

const SkillChip = ({ children, deleteLabel, onDelete }: SkillChipProps) => (
	<li className="group/chip inline-flex h-8 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1 transition-colors focus-within:border-border hover:border-border">
		<div className="w-0 overflow-hidden opacity-0 transition-[width,opacity] duration-200 ease-out group-focus-within/chip:w-7 group-focus-within/chip:opacity-100 group-hover/chip:w-7 group-hover/chip:opacity-100 sm:group-hover/chip:w-6 sm:group-focus-within/chip:w-6">
			<Button aria-label={deleteLabel} onClick={onDelete} size="icon-xs" type="button" variant="destructive-ghost">
				<TrashIcon />
			</Button>
		</div>

		{children}
	</li>
);

export const InlineSkills = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<SectionBlockNode>(),
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
					<ul className="flex flex-wrap gap-1.5">
						{items.map((item) => {
							if (item.blockType !== "skill_item") {
								return null;
							}
							const itemIndex = blockIndexById.get(item.id);
							if (itemIndex === undefined) {
								return null;
							}
							return (
								<SkillChip
									deleteLabel="Eliminar idioma"
									key={getBlockKey(item.id)}
									onDelete={() => deleteBlock.mutate({ id: item.id, resumeId: params.resumeId })}
								>
									<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
										{(field) => (
											<InlineTextEditor
												className="px-1 hover:bg-transparent focus:bg-transparent"
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
												<SelectTrigger
													aria-label="Nivel"
													className="h-6 min-h-0 w-24 gap-1 rounded-sm border-0 bg-transparent px-1.5 text-muted-foreground text-xs shadow-none before:hidden hover:bg-accent/50"
													onBlur={field.handleBlur}
													size="sm"
												>
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
								</SkillChip>
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
								<Button
									aria-label="Eliminar categoría"
									className="opacity-0 transition-opacity group-focus-within/line:opacity-100 group-hover/line:opacity-100"
									onClick={() => deleteBlock.mutate({ id: line.id, resumeId: params.resumeId })}
									size="icon-sm"
									type="button"
									variant="destructive-ghost"
								>
									<TrashIcon />
								</Button>
							</div>

							<ul className="flex flex-wrap gap-1.5">
								{items.map((item) => {
									if (item.blockType !== "skill_item") {
										return null;
									}
									const itemIndex = blockIndexById.get(item.id);
									if (itemIndex === undefined) {
										return null;
									}
									return (
										<SkillChip
											deleteLabel="Eliminar habilidad"
											key={getBlockKey(item.id)}
											onDelete={() => deleteBlock.mutate({ id: item.id, resumeId: params.resumeId })}
										>
											<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
												{(field) => (
													<InlineTextEditor
														className="px-1 hover:bg-transparent focus:bg-transparent"
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
														<SelectTrigger
															aria-label="Nivel"
															className="h-6 min-h-0 w-28 gap-1 rounded-sm border-0 bg-transparent px-1.5 text-muted-foreground text-xs shadow-none before:hidden hover:bg-accent/50"
															onBlur={field.handleBlur}
															size="sm"
														>
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
										</SkillChip>
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

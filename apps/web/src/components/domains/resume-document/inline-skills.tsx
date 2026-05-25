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
import { Spinner } from "@/components/ui/spinner";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { InlineTextEditor } from "./inline-text-editor";

const SKILL_PROFICIENCIES: readonly SkillProficiency[] = ["beginner", "intermediate", "advanced", "expert"];
const LANGUAGE_PROFICIENCIES: readonly SkillProficiency[] = ["basic", "conversational", "fluent", "native"];

const skillProficiencyOptions = buildLabeledOptions(SKILL_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);
const languageProficiencyOptions = buildLabeledOptions(LANGUAGE_PROFICIENCIES, SKILL_PROFICIENCY_LABELS);

interface SkillChipProps {
	deleteLabel: string;
	onDelete: () => void;
	proficiencyControl: ReactNode;
	valueEditor: ReactNode;
}

const SkillChip = ({ deleteLabel, onDelete, proficiencyControl, valueEditor }: SkillChipProps) => (
	<li className="group/chip relative grid min-w-0 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 transition-colors focus-within:border-border hover:border-border sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center">
		<div className="min-w-0">{valueEditor}</div>
		<div className="min-w-0 transition-transform duration-200 ease-out sm:justify-self-end sm:group-focus-within/chip:-translate-x-8 [@media(hover:hover)]:sm:group-hover/chip:-translate-x-8">
			{proficiencyControl}
		</div>
		<Button
			aria-label={deleteLabel}
			className="pointer-events-none absolute top-2 right-2 translate-x-1 opacity-0 transition-[opacity,transform] duration-200 ease-out group-focus-within/chip:pointer-events-auto group-focus-within/chip:translate-x-0 group-focus-within/chip:opacity-100 sm:top-1/2 sm:-translate-y-1/2 sm:group-focus-within/chip:-translate-y-1/2 [@media(hover:hover)]:group-hover/chip:pointer-events-auto [@media(hover:hover)]:group-hover/chip:translate-x-0 [@media(hover:hover)]:group-hover/chip:opacity-100 [@media(hover:hover)]:sm:group-hover/chip:-translate-y-1/2"
			onClick={onDelete}
			size="icon-sm"
			type="button"
			variant="destructive-ghost"
		>
			<TrashIcon />
		</Button>
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
					<ul className="grid gap-2 lg:grid-cols-2">
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
									proficiencyControl={
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
														className="h-8 min-h-0 w-full min-w-0 gap-1 rounded-md border-0 bg-transparent px-1.5 text-muted-foreground text-xs shadow-none before:hidden hover:bg-accent/50 sm:w-28"
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
									}
									valueEditor={
										<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
											{(field) => (
												<InlineTextEditor
													className="w-full min-w-0 break-words px-1 hover:bg-transparent focus:bg-transparent"
													onBlur={() => field.handleBlur()}
													onChange={(value) => field.handleChange(value)}
													placeholder={itemPlaceholder}
													value={(field.state.value ?? "") as string}
													variant="plain"
												/>
											)}
										</form.AppField>
									}
								/>
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
						<div className="group/line flex flex-col gap-2" key={getBlockKey(line.id)}>
							<div className="relative min-w-0">
								<form.AppField name={`blocks[${lineIndex}].content.label` as const}>
									{(field) => (
										<div className="min-w-0">
											<InlineTextEditor
												className="w-full min-w-0"
												onBlur={() => field.handleBlur()}
												onChange={(value) => field.handleChange(value)}
												placeholder="Categoría"
												value={(field.state.value ?? "") as string}
												variant="subtitle"
											/>
										</div>
									)}
								</form.AppField>
								<Button
									aria-label="Eliminar categoría"
									className="pointer-events-none absolute top-0 right-0 translate-x-1 opacity-0 transition-[opacity,transform] duration-200 ease-out group-focus-within/line:pointer-events-auto group-focus-within/line:translate-x-0 group-focus-within/line:opacity-100 data-[pending=true]:pointer-events-auto data-[pending=true]:translate-x-0 data-[pending=true]:opacity-100 [@media(hover:hover)]:group-hover/line:pointer-events-auto [@media(hover:hover)]:group-hover/line:translate-x-0 [@media(hover:hover)]:group-hover/line:opacity-100"
									data-pending={deleteBlock.isPending && deleteBlock.variables?.id === line.id}
									disabled={deleteBlock.isPending && deleteBlock.variables?.id === line.id}
									onClick={() => deleteBlock.mutate({ id: line.id, resumeId: params.resumeId })}
									size="icon-sm"
									type="button"
									variant="destructive-ghost"
								>
									{deleteBlock.isPending && deleteBlock.variables?.id === line.id ? (
										<Spinner className="size-4" />
									) : (
										<TrashIcon />
									)}
								</Button>
							</div>

							<ul className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
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
											proficiencyControl={
												<form.AppField name={`blocks[${itemIndex}].content.proficiency` as const}>
													{(field) => (
														<Select
															items={proficiencyOptions}
															onValueChange={(next) =>
																field.handleChange(
																	next === "" || next === null ? undefined : (next as SkillProficiency)
																)
															}
															value={(field.state.value ?? "") as string}
														>
															<SelectTrigger
																aria-label="Nivel"
																className="h-8 min-h-0 w-full min-w-0 gap-1 rounded-md border-0 bg-transparent px-1.5 text-muted-foreground text-xs shadow-none before:hidden hover:bg-accent/50 sm:w-28"
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
											}
											valueEditor={
												<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
													{(field) => (
														<InlineTextEditor
															className="w-full min-w-0 break-words px-1 hover:bg-transparent focus:bg-transparent"
															onBlur={() => field.handleBlur()}
															onChange={(value) => field.handleChange(value)}
															placeholder={itemPlaceholder}
															value={(field.state.value ?? "") as string}
															variant="plain"
														/>
													)}
												</form.AppField>
											}
										/>
									);
								})}
							</ul>

							<div className="transition-opacity group-focus-within/line:opacity-100 [@media(hover:hover)]:group-hover/line:opacity-100">
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

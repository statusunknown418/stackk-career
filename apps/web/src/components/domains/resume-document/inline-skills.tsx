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
import { useMemo } from "react";
import { getBlockKey } from "@/components/domains/resume-document/block-key-registry";
import { useCreateBlock, useDeleteBlock } from "@/components/domains/resume-editor/use-block-mutations";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

			const lineIndex = blockIndexById.get(primaryLine.id);

			return (
				<div className="space-y-2 py-1" data-block-id={primaryLine.id}>
					<div className="group/line grid grid-cols-[max-content_1fr] items-baseline gap-x-2.5 font-serif text-sm">
						<div className="flex select-none items-baseline pr-1 text-left text-foreground">
							{lineIndex === undefined ? (
								<span className="select-none">Idiomas:</span>
							) : (
								<>
									<form.AppField name={`blocks[${lineIndex}].content.label` as const}>
										{(field) => (
											<InlineTextEditor
												className="w-full rounded-sm font-bold font-serif text-sm hover:bg-accent/40"
												onBlur={() => field.handleBlur()}
												onChange={(value) => field.handleChange(value)}
												placeholder="Categoría"
												value={(field.state.value ?? "") as string}
												variant="plain"
											/>
										)}
									</form.AppField>
									<span className="mr-1 select-none font-bold">:</span>
								</>
							)}
						</div>
						<div className="flex flex-1 flex-wrap items-center gap-x-1 gap-y-1">
							{items.map((item, itemIdx) => {
								if (item.blockType !== "skill_item") {
									return null;
								}
								const itemIndex = blockIndexById.get(item.id);
								if (itemIndex === undefined) {
									return null;
								}
								const isLast = itemIdx === items.length - 1;

								return (
									<div className="flex items-center" key={item.id}>
										<Popover>
											<PopoverTrigger className="cursor-pointer rounded px-1 py-0.5 font-medium font-sans text-foreground text-sm transition-all duration-150 hover:bg-accent/80">
												{item.content.value || "[Nuevo idioma]"}
												{item.content.proficiency && (
													<span className="ml-1 font-normal text-muted-foreground text-xs">
														({SKILL_PROFICIENCY_LABELS[item.content.proficiency]})
													</span>
												)}
											</PopoverTrigger>
											<PopoverContent className="w-80 p-4">
												<div className="flex flex-col gap-4">
													<div className="flex items-center justify-between">
														<span className="font-bold text-foreground text-sm">Editar idioma</span>
														<Button
															aria-label="Eliminar idioma"
															onClick={() => deleteBlock.mutate({ id: item.id, resumeId: params.resumeId })}
															size="icon-sm"
															type="button"
															variant="destructive-ghost"
														>
															<TrashIcon className="size-4" />
														</Button>
													</div>
													<div className="flex flex-col gap-3">
														<div className="flex flex-col gap-1">
															<span className="font-semibold text-muted-foreground text-sm">Idioma</span>
															<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
																{(field) => (
																	<input
																		className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
																		onBlur={() => field.handleBlur()}
																		onChange={(e) => field.handleChange(e.target.value)}
																		placeholder={itemPlaceholder}
																		type="text"
																		value={(field.state.value ?? "") as string}
																	/>
																)}
															</form.AppField>
														</div>
														<div className="flex flex-col gap-1">
															<span className="font-semibold text-muted-foreground text-sm">Nivel (Opcional)</span>
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
																		<SelectTrigger aria-label="Nivel" className="w-full" size="sm">
																			<SelectValue placeholder="Ninguno / Sin especificar" />
																		</SelectTrigger>
																		<SelectPopup>
																			<SelectItem value="">Ninguno / Sin especificar</SelectItem>
																			{proficiencyOptions.map((option) => (
																				<SelectItem key={option.value} value={option.value}>
																					{option.label}
																				</SelectItem>
																			))}
																		</SelectPopup>
																	</Select>
																)}
															</form.AppField>
														</div>
													</div>
												</div>
											</PopoverContent>
										</Popover>
										{!isLast && <span className="pointer-events-none mr-1.5 select-none text-muted-foreground">,</span>}
									</div>
								);
							})}

							<Button
								className="rounded-full opacity-0 transition-opacity duration-200 group-hover/line:opacity-100"
								disabled={createBlock.isPending}
								onClick={handleAddItem}
								size="icon"
								title={addItemLabel}
								type="button"
								variant="ghost"
							>
								<PlusIcon />
							</Button>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="space-y-4 py-1">
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
						<div
							className="group/line grid grid-cols-[max-content_1fr] items-baseline gap-x-2.5 font-serif text-sm"
							data-block-id={line.id}
							key={getBlockKey(line.id)}
						>
							<div className="group/label relative flex select-none items-baseline pr-1 text-left font-bold text-foreground">
								<Button
									aria-label="Eliminar categoría"
									className="pointer-events-none absolute top-1/2 -left-6 -translate-y-1/2 opacity-0 transition-[opacity,transform] duration-200 ease-out group-focus-within/line:pointer-events-auto group-focus-within/line:translate-x-0 group-focus-within/line:opacity-100 data-[pending=true]:pointer-events-auto data-[pending=true]:translate-x-0 data-[pending=true]:opacity-100 [@media(hover:hover)]:group-hover/line:pointer-events-auto [@media(hover:hover)]:group-hover/line:translate-x-0 [@media(hover:hover)]:group-hover/line:opacity-100"
									data-pending={deleteBlock.isPending && deleteBlock.variables?.id === line.id}
									disabled={deleteBlock.isPending && deleteBlock.variables?.id === line.id}
									onClick={() => deleteBlock.mutate({ id: line.id, resumeId: params.resumeId })}
									size="icon-sm"
									type="button"
									variant="destructive-ghost"
								>
									{deleteBlock.isPending && deleteBlock.variables?.id === line.id ? <Spinner /> : <TrashIcon />}
								</Button>
								<form.AppField name={`blocks[${lineIndex}].content.label` as const}>
									{(field) => (
										<div className="min-w-0">
											<InlineTextEditor
												className="w-full rounded-sm font-normal! font-serif text-base text-muted-foreground tracking-wide hover:bg-accent/40"
												onBlur={() => field.handleBlur()}
												onChange={(value) => field.handleChange(value)}
												placeholder="Categoría"
												value={(field.state.value ?? "") as string}
												variant="plain"
											/>
										</div>
									)}
								</form.AppField>
								<span className="mr-1 select-none font-bold">:</span>
							</div>

							<div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
								{items.map((item, itemIdx) => {
									if (item.blockType !== "skill_item") {
										return null;
									}
									const itemIndex = blockIndexById.get(item.id);
									if (itemIndex === undefined) {
										return null;
									}
									const isLast = itemIdx === items.length - 1;

									return (
										<div className="flex items-center" key={item.id}>
											<Popover>
												<PopoverTrigger className="cursor-pointer rounded px-1 py-0.5 font-medium font-sans text-foreground text-sm transition-all duration-150 hover:bg-accent/80">
													{item.content.value || "[Nueva habilidad]"}

													{item.content.proficiency && (
														<span className="ml-1 font-normal text-muted-foreground text-sm">
															({SKILL_PROFICIENCY_LABELS[item.content.proficiency]})
														</span>
													)}
												</PopoverTrigger>
												<PopoverContent className="w-80">
													<div className="flex flex-col gap-3">
														<div className="flex items-center justify-between">
															<span className="text-foreground">Editar habilidad</span>
															<Button
																aria-label="Eliminar habilidad"
																onClick={() => deleteBlock.mutate({ id: item.id, resumeId: params.resumeId })}
																size="icon-sm"
																type="button"
																variant="destructive-ghost"
															>
																<TrashIcon className="size-4" />
															</Button>
														</div>
														<div className="flex flex-col gap-3">
															<div className="flex flex-col gap-1">
																<span className="text-muted-foreground text-sm">Habilidad</span>
																<form.AppField name={`blocks[${itemIndex}].content.value` as const}>
																	{(field) => (
																		<input
																			className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
																			onBlur={() => field.handleBlur()}
																			onChange={(e) => field.handleChange(e.target.value)}
																			placeholder={itemPlaceholder}
																			type="text"
																			value={(field.state.value ?? "") as string}
																		/>
																	)}
																</form.AppField>
															</div>
															<div className="flex flex-col gap-1">
																<span className="text-muted-foreground text-sm">Nivel (Opcional)</span>
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
																			<SelectTrigger aria-label="Nivel" className="w-full" size="sm">
																				<SelectValue placeholder="Ninguno / Sin especificar" />
																			</SelectTrigger>
																			<SelectPopup>
																				<SelectItem value="">Ninguno / Sin especificar</SelectItem>
																				{proficiencyOptions.map((option) => (
																					<SelectItem key={option.value} value={option.value}>
																						{option.label}
																					</SelectItem>
																				))}
																			</SelectPopup>
																		</Select>
																	)}
																</form.AppField>
															</div>
														</div>
													</div>
												</PopoverContent>
											</Popover>
											{!isLast && (
												<span className="pointer-events-none mr-1.5 select-none text-muted-foreground/60">,</span>
											)}
										</div>
									);
								})}

								<Button
									className="h-6 w-6 rounded-full opacity-0 transition-opacity duration-200 group-hover/line:opacity-100"
									disabled={createBlock.isPending}
									onClick={handleAddItem}
									size="icon-xs"
									title={addItemLabel}
									type="button"
									variant="ghost"
								>
									<PlusIcon />
								</Button>
							</div>
						</div>
					);
				})}

				<Button
					className="rounded-full opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100 group-hover/section:opacity-100"
					disabled={createBlock.isPending}
					onClick={handleAddCategory}
					size="lg"
					type="button"
					variant="outline"
				>
					<PlusIcon />
					Agregar categoría
				</Button>
			</div>
		);
	},
});

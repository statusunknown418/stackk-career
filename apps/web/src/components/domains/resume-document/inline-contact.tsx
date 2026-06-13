"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import {
	type BlockNode,
	buildLabeledOptions,
	CONTACT_ITEM_KINDS,
	CONTACT_ITEM_LABELS,
	type ContactItemKind,
} from "@stackk-career/schemas/db/resume-blocks";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { InlineTextEditor } from "./inline-text-editor";

type ContactBlock = Extract<BlockNode, { blockType: "contact" }>;
type ContactItem = ContactBlock["content"]["items"][number];

const contactKindOptions = buildLabeledOptions(CONTACT_ITEM_KINDS, CONTACT_ITEM_LABELS);

const createEmptyContactItem = (): ContactItem => ({
	kind: "email" satisfies ContactItemKind,
	value: "",
});

export const InlineContact = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<ContactBlock>(),
		blockIndex: 0,
	},
	render: ({ form, blockIndex }) => {
		const itemsName = `blocks[${blockIndex}].content.items` as const;

		return (
			<header className="group/contact flex flex-col items-center gap-3 text-center">
				<div className="flex w-full flex-wrap items-center justify-center gap-x-2.5 text-center">
					<form.AppField name={`blocks[${blockIndex}].content.firstName` as const}>
						{(field) => (
							<div className="min-w-0">
								<InlineTextEditor
									className="text-center font-bold font-serif text-3xl uppercase tracking-wider"
									onBlur={() => field.handleBlur()}
									onChange={(value) => field.handleChange(value)}
									placeholder="Nombre"
									value={(field.state.value ?? "") as string}
									variant="heading"
								/>
							</div>
						)}
					</form.AppField>
					<form.AppField name={`blocks[${blockIndex}].content.lastName` as const}>
						{(field) => (
							<div className="min-w-0">
								<InlineTextEditor
									className="text-center font-bold font-serif text-3xl uppercase tracking-wider"
									onBlur={() => field.handleBlur()}
									onChange={(value) => field.handleChange(value)}
									placeholder="Apellido"
									value={(field.state.value ?? "") as string}
									variant="heading"
								/>
							</div>
						)}
					</form.AppField>
				</div>

				<form.Field mode="array" name={itemsName}>
					{(itemsField) => (
						<div className="flex w-full flex-col items-center gap-2.5">
							<div className="flex w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center font-medium text-muted-foreground text-sm">
								{itemsField.state.value.map((item, itemIndex) => {
									const isLast = itemIndex === itemsField.state.value.length - 1;
									return (
										<div className="flex items-center gap-1.5" key={itemIndex.toString()}>
											<Popover>
												<PopoverTrigger className="cursor-pointer select-none break-all rounded-sm px-1.5 py-0.5 font-medium font-sans text-sm transition-all duration-200 hover:bg-accent/80 hover:text-foreground">
													{item.value || `[Añadir ${CONTACT_ITEM_LABELS[item.kind]}]`}
												</PopoverTrigger>
												<PopoverContent className="w-80">
													<div className="flex flex-col gap-3">
														<div className="flex items-center justify-between">
															<span className="font-bold text-foreground text-sm">Editar contacto</span>
															<Button
																aria-label="Eliminar contacto"
																onClick={() => itemsField.removeValue(itemIndex)}
																size="icon-sm"
																type="button"
																variant="destructive-ghost"
															>
																<TrashIcon className="size-4" />
															</Button>
														</div>
														<div className="flex flex-col gap-3">
															<div className="flex flex-col gap-1">
																<span className="font-semibold text-[11px] text-muted-foreground">
																	Tipo de contacto
																</span>
																<form.AppField name={`${itemsName}[${itemIndex}].kind` as const}>
																	{(field) => (
																		<Select
																			items={contactKindOptions}
																			onValueChange={(next) => field.handleChange(next as ContactItemKind)}
																			value={field.state.value as string}
																		>
																			<SelectTrigger aria-label="Tipo de contacto" className="w-full" size="sm">
																				<SelectValue />
																			</SelectTrigger>
																			<SelectPopup>
																				{contactKindOptions.map((option) => (
																					<SelectItem key={option.value} value={option.value}>
																						{option.label}
																					</SelectItem>
																				))}
																			</SelectPopup>
																		</Select>
																	)}
																</form.AppField>
															</div>
															<div className="flex flex-col gap-1">
																<span className="font-semibold text-[11px] text-muted-foreground">Valor</span>
																<form.AppField name={`${itemsName}[${itemIndex}].value` as const}>
																	{(field) => (
																		<input
																			className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
																			onBlur={() => field.handleBlur()}
																			onChange={(e) => field.handleChange(e.target.value)}
																			placeholder={CONTACT_ITEM_LABELS[item.kind]}
																			type="text"
																			value={(field.state.value ?? "") as string}
																		/>
																	)}
																</form.AppField>
															</div>
														</div>
													</div>
												</PopoverContent>
											</Popover>
											{!isLast && (
												<span className="pointer-events-none select-none px-0.5 font-normal text-muted-foreground/30">
													|
												</span>
											)}
										</div>
									);
								})}
							</div>

							<Button
								className="flex h-7 items-center gap-1.5 rounded-full border border-border/80 border-dashed px-3 py-1 font-semibold text-muted-foreground text-xs opacity-0 transition-opacity duration-200 hover:border-primary/50 hover:text-foreground group-hover/contact:opacity-100"
								onClick={() => itemsField.pushValue(createEmptyContactItem())}
								size="sm"
								type="button"
								variant="ghost"
							>
								<PlusIcon className="size-3.5" />
								Agregar contacto
							</Button>
						</div>
					)}
				</form.Field>
			</header>
		);
	},
});

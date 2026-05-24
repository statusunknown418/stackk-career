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
			<header className="group/contact flex flex-col gap-4">
				<div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
					<form.AppField name={`blocks[${blockIndex}].content.firstName` as const}>
						{(field) => (
							<div className="min-w-0">
								<InlineTextEditor
									className="w-full min-w-0"
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
									className="w-full min-w-0"
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
						<div className="space-y-2">
							{itemsField.state.value.map((item, itemIndex) => (
								<div
									className="group/item grid min-w-0 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 transition-colors focus-within:border-border hover:border-border sm:grid-cols-[11rem_minmax(0,1fr)_2rem] sm:items-start"
									key={itemIndex.toString()}
								>
									<div className="min-w-0">
										<form.AppField name={`${itemsName}[${itemIndex}].kind` as const}>
											{(field) => (
												<Select
													items={contactKindOptions}
													onValueChange={(next) => field.handleChange(next as ContactItemKind)}
													value={field.state.value as string}
												>
													<SelectTrigger
														aria-label="Tipo de contacto"
														className="w-full min-w-0"
														onBlur={field.handleBlur}
														size="sm"
													>
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
									<div className="min-w-0 pt-0.5">
										<form.AppField name={`${itemsName}[${itemIndex}].value` as const}>
											{(field) => (
												<InlineTextEditor
													className="w-full min-w-0 break-words"
													onBlur={() => field.handleBlur()}
													onChange={(value) => field.handleChange(value)}
													placeholder={CONTACT_ITEM_LABELS[item.kind]}
													value={(field.state.value ?? "") as string}
													variant="plain"
												/>
											)}
										</form.AppField>
									</div>
									<div className="flex h-8 items-start justify-end">
										<Button
											aria-label="Eliminar contacto"
											className="opacity-0 transition-opacity group-focus-within/item:opacity-100 [@media(hover:hover)]:group-hover/item:opacity-100"
											onClick={() => itemsField.removeValue(itemIndex)}
											size="icon-sm"
											type="button"
											variant="destructive-ghost"
										>
											<TrashIcon />
										</Button>
									</div>
								</div>
							))}

							<Button
								className="w-max"
								onClick={() => itemsField.pushValue(createEmptyContactItem())}
								size="sm"
								type="button"
								variant="ghost"
							>
								<PlusIcon />
								Agregar contacto
							</Button>
						</div>
					)}
				</form.Field>
			</header>
		);
	},
});

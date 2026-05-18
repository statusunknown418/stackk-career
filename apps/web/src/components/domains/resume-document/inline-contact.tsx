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
			<header className="group/contact flex flex-col gap-2">
				<div className="flex flex-wrap items-baseline gap-x-2">
					<form.AppField name={`blocks[${blockIndex}].content.firstName` as const}>
						{(field) => (
							<InlineTextEditor
								onBlur={() => field.handleBlur()}
								onChange={(value) => field.handleChange(value)}
								placeholder="Nombre"
								value={(field.state.value ?? "") as string}
								variant="heading"
							/>
						)}
					</form.AppField>
					<form.AppField name={`blocks[${blockIndex}].content.lastName` as const}>
						{(field) => (
							<InlineTextEditor
								onBlur={() => field.handleBlur()}
								onChange={(value) => field.handleChange(value)}
								placeholder="Apellido"
								value={(field.state.value ?? "") as string}
								variant="heading"
							/>
						)}
					</form.AppField>
				</div>

				<form.Field mode="array" name={itemsName}>
					{(itemsField) => (
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
							{itemsField.state.value.map((item, itemIndex) => (
								<div className="group/item flex items-center gap-1" key={itemIndex.toString()}>
									<form.AppField name={`${itemsName}[${itemIndex}].kind` as const}>
										{(field) => (
											<Select
												items={contactKindOptions}
												onValueChange={(next) => field.handleChange(next as ContactItemKind)}
												value={field.state.value as string}
											>
												<SelectTrigger aria-label="Tipo de contacto" onBlur={field.handleBlur} size="sm">
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
									<form.AppField name={`${itemsName}[${itemIndex}].value` as const}>
										{(field) => (
											<InlineTextEditor
												onBlur={() => field.handleBlur()}
												onChange={(value) => field.handleChange(value)}
												placeholder={CONTACT_ITEM_LABELS[item.kind]}
												value={(field.state.value ?? "") as string}
												variant="plain"
											/>
										)}
									</form.AppField>
									<Button
										aria-label="Eliminar contacto"
										className="opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100"
										onClick={() => itemsField.removeValue(itemIndex)}
										size="icon-sm"
										type="button"
										variant="destructive-ghost"
									>
										<TrashIcon />
									</Button>
								</div>
							))}

							<Button
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

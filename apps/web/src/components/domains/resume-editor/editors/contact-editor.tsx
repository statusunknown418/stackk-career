"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import {
	type BlockNode,
	buildLabeledOptions,
	CONTACT_ITEM_KINDS,
	CONTACT_ITEM_LABELS,
	type ContactItemKind,
	getContactItemLabel,
} from "@stackk-career/schemas/db/resume-blocks";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel } from "@/components/ui/frame";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";

type ContactBlock = Extract<BlockNode, { blockType: "contact" }>;
type ContactItem = ContactBlock["content"]["items"][number];

const contactKindOptions = buildLabeledOptions(CONTACT_ITEM_KINDS, CONTACT_ITEM_LABELS);

const createEmptyContactItem = (): ContactItem => ({
	kind: "email" satisfies ContactItemKind,
	label: "",
	value: "",
});

export const ContactEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<ContactBlock>(),
		blockIndex: 0,
	},
	render: ({ form, blockIndex }) => {
		const itemsName = `blocks[${blockIndex}].content.items` as const;

		return (
			<Frame>
				<FrameHeader>
					<div className="grid gap-2 md:grid-cols-2">
						<form.AppField name={`blocks[${blockIndex}].content.firstName` as const}>
							{(field) => <field.TextField label="Nombre" />}
						</form.AppField>
						<form.AppField name={`blocks[${blockIndex}].content.lastName` as const}>
							{(field) => <field.TextField label="Apellido" />}
						</form.AppField>
					</div>
					<FrameDescription>Información de contacto</FrameDescription>
				</FrameHeader>
				<FramePanel>
					<form.Field mode="array" name={itemsName}>
						{(itemsField) => (
							<ul className="flex flex-col gap-2">
								{itemsField.state.value.map((item, itemIndex) => (
									<li
										className="group grid grid-cols-1 items-end gap-2 md:grid-cols-[160px_180px_1fr_auto]"
										key={itemIndex.toString()}
									>
										<form.AppField name={`${itemsName}[${itemIndex}].kind` as const}>
											{(field) => <field.SelectField label="Tipo" options={contactKindOptions} />}
										</form.AppField>
										<form.AppField name={`${itemsName}[${itemIndex}].label` as const}>
											{(field) => (
												<field.TextField label="Etiqueta" placeholder={getContactItemLabel(item.kind, item.label)} />
											)}
										</form.AppField>
										<form.AppField name={`${itemsName}[${itemIndex}].value` as const}>
											{(field) => <field.TextField label="Valor" />}
										</form.AppField>
										<Button
											aria-label="Eliminar contacto"
											className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
											onClick={() => itemsField.removeValue(itemIndex)}
											size="icon-sm"
											type="button"
											variant="destructive-outline"
										>
											<TrashIcon />
										</Button>
									</li>
								))}
							</ul>
						)}
					</form.Field>
				</FramePanel>
				<FrameFooter className="flex justify-start">
					<form.Field mode="array" name={itemsName}>
						{(itemsField) => (
							<Button
								onClick={() => itemsField.pushValue(createEmptyContactItem())}
								size="sm"
								type="button"
								variant="outline"
							>
								<PlusIcon />
								Agregar contacto
							</Button>
						)}
					</form.Field>
				</FrameFooter>
			</Frame>
		);
	},
});

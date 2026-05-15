"use client";

import { AddressBookIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import {
	type BlockNode,
	buildLabeledOptions,
	CONTACT_ITEM_KINDS,
	CONTACT_ITEM_LABELS,
	type ContactItemKind,
} from "@stackk-career/schemas/db/resume-blocks";
import { Button } from "@/components/ui/button";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { TimelineSection } from "../timeline-section";

type ContactBlock = Extract<BlockNode, { blockType: "contact" }>;
type ContactItem = ContactBlock["content"]["items"][number];

const contactKindOptions = buildLabeledOptions(CONTACT_ITEM_KINDS, CONTACT_ITEM_LABELS);

const createEmptyContactItem = (): ContactItem => ({
	kind: "email" satisfies ContactItemKind,
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
			<TimelineSection icon={AddressBookIcon} title="Contacto">
				<div className="space-y-4">
					<div className="grid gap-3 md:grid-cols-2">
						<form.AppField name={`blocks[${blockIndex}].content.firstName` as const}>
							{(field) => <field.TextField label="Nombre" />}
						</form.AppField>
						<form.AppField name={`blocks[${blockIndex}].content.lastName` as const}>
							{(field) => <field.TextField label="Apellido" />}
						</form.AppField>
					</div>

					<form.Field mode="array" name={itemsName}>
						{(itemsField) => (
							<div className="space-y-3">
								<div className="space-y-2">
									{itemsField.state.value.map((item, itemIndex) => (
										<div
											className="group/item relative grid grid-cols-[160px_1fr_auto] items-center gap-2 rounded-lg bg-muted/40 px-3 py-2"
											key={itemIndex.toString()}
										>
											<form.AppField name={`${itemsName}[${itemIndex}].kind` as const}>
												{(field) => <field.SelectField aria-label="Tipo de contacto" options={contactKindOptions} />}
											</form.AppField>
											<form.AppField name={`${itemsName}[${itemIndex}].value` as const}>
												{(field) => (
													<field.TextField
														aria-label={CONTACT_ITEM_LABELS[item.kind]}
														placeholder={CONTACT_ITEM_LABELS[item.kind]}
													/>
												)}
											</form.AppField>
											<Button
												aria-label="Eliminar contacto"
												className="opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100"
												onClick={() => itemsField.removeValue(itemIndex)}
												size="icon-sm"
												type="button"
												variant="ghost"
											>
												<TrashIcon />
											</Button>
										</div>
									))}
								</div>

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
				</div>
			</TimelineSection>
		);
	},
});

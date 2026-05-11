"use client";

import { createId } from "@paralleldrive/cuid2";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { type BlockNode, getContactItemLabel } from "@stackk-career/schemas/db/resume-blocks";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel } from "@/components/ui/frame";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";

type ContactBlock = Extract<BlockNode, { blockType: "contact" }>;
type ContactItem = ContactBlock["content"]["items"][number];
type ContactKind = ContactItem["kind"];

const contactKindOptions: readonly { label: string; value: ContactKind }[] = [
	{ label: "Email", value: "email" },
	{ label: "Teléfono", value: "phone" },
	{ label: "LinkedIn", value: "linkedin" },
	{ label: "Web", value: "website" },
	{ label: "Dirección", value: "address" },
	{ label: "Otro", value: "other" },
];

export const ContactEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		block: propType<ContactBlock>(),
		blockIndex: 0,
	},
	render: ({ form, block, blockIndex }) => {
		// Contact items have no stable id in the schema, but the editor needs stable
		// React keys so editing a row doesn't remount it. We mint a per-item cuid on
		// first render and reconcile against `items.length` synchronously: appended
		// items get fresh cuids, removed tail items drop their cuids.
		const itemKeysRef = useRef<string[]>([]);
		const itemCount = block.content.items.length;

		if (itemKeysRef.current.length < itemCount) {
			const added = itemCount - itemKeysRef.current.length;
			itemKeysRef.current = [...itemKeysRef.current, ...Array.from({ length: added }, () => createId())];
		} else if (itemKeysRef.current.length > itemCount) {
			itemKeysRef.current = itemKeysRef.current.slice(0, itemCount);
		}

		const itemsPath = `blocks[${blockIndex}].content.items` as const;

		const addItem = () => {
			const next: ContactItem[] = [...block.content.items, { kind: "email", label: "", value: "" }];
			itemKeysRef.current = [...itemKeysRef.current, createId()];
			form.setFieldValue(itemsPath, next);
		};

		const removeItem = (idx: number) => {
			const next = block.content.items.filter((_, i) => i !== idx);
			itemKeysRef.current = itemKeysRef.current.filter((_, i) => i !== idx);
			form.setFieldValue(itemsPath, next);
		};

		return (
			<Frame>
				<FrameHeader>
					<div className="grid gap-2 md:grid-cols-2">
						<form.AppField name={`blocks[${blockIndex}].content.firstName` as const}>
							{(field) => <field.TextField className="px-0 font-semibold text-xl sm:text-lg" label="Nombre" />}
						</form.AppField>
						<form.AppField name={`blocks[${blockIndex}].content.lastName` as const}>
							{(field) => <field.TextField className="px-0 font-semibold text-xl sm:text-lg" label="Apellido" />}
						</form.AppField>
					</div>
					<FrameDescription>Información de contacto</FrameDescription>
				</FrameHeader>
				<FramePanel>
					<ul className="flex flex-col gap-2">
						{block.content.items.map((item, itemIndex) => (
							<li
								className="group grid grid-cols-1 items-end gap-2 md:grid-cols-[160px_180px_1fr_auto]"
								key={itemKeysRef.current[itemIndex]}
							>
								<form.AppField name={`blocks[${blockIndex}].content.items[${itemIndex}].kind` as const}>
									{(field) => <field.SelectField label="Tipo" options={contactKindOptions} />}
								</form.AppField>
								<form.AppField name={`blocks[${blockIndex}].content.items[${itemIndex}].label` as const}>
									{(field) => (
										<field.TextField label="Etiqueta" placeholder={getContactItemLabel(item.kind, item.label)} />
									)}
								</form.AppField>
								<form.AppField name={`blocks[${blockIndex}].content.items[${itemIndex}].value` as const}>
									{(field) => <field.TextField label="Valor" />}
								</form.AppField>
								<Button
									aria-label="Eliminar contacto"
									className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
									onClick={() => removeItem(itemIndex)}
									size="icon-sm"
									type="button"
									variant="ghost"
								>
									<TrashIcon />
								</Button>
							</li>
						))}
					</ul>
				</FramePanel>
				<FrameFooter className="flex justify-start">
					<Button onClick={addItem} size="sm" type="button" variant="ghost">
						<PlusIcon />
						Agregar contacto
					</Button>
				</FrameFooter>
			</Frame>
		);
	},
});

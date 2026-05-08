"use client";

import { createId } from "@paralleldrive/cuid2";
import { type BlockNode, getContactItemLabel } from "@stackk-career/schemas/db/resume-blocks";
import { useRef } from "react";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import type { ResumeAutosave } from "../use-resume-autosave";

type ContactBlock = Extract<BlockNode, { blockType: "contact" }>;

const contactKinds = ["address", "email", "phone", "linkedin", "website", "other"] as const;

export const ContactEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		autosave: propType<ResumeAutosave>(),
		block: propType<ContactBlock>(),
		blockIndex: 0,
	},
	render: ({ form, autosave, block, blockIndex }) => {
		const blockListeners = {
			onBlur: () => autosave.flushBlockSave(block.id),
			onChange: () => autosave.queueBlockSave(block.id),
		};

		// Contact items have no stable id in the schema, but the editor needs stable
		// React keys so editing a row doesn't remount it. We mint a per-item cuid on
		// first render and reconcile against `items.length` synchronously: appended
		// items get fresh cuids, removed tail items drop their cuids. Mid-list
		// removal/reorder isn't supported by the UI today.
		const itemKeysRef = useRef<string[]>([]);
		const itemCount = block.content.items.length;
		if (itemKeysRef.current.length < itemCount) {
			const added = itemCount - itemKeysRef.current.length;
			itemKeysRef.current = [...itemKeysRef.current, ...Array.from({ length: added }, () => createId())];
		} else if (itemKeysRef.current.length > itemCount) {
			itemKeysRef.current = itemKeysRef.current.slice(0, itemCount);
		}

		return (
			<Frame>
				<FrameHeader>
					<div className="grid gap-2 md:grid-cols-2">
						<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.firstName` as const}>
							{(field) => <field.TextField className="px-0 font-semibold text-xl sm:text-lg" label="Nombre" />}
						</form.AppField>
						<form.AppField listeners={blockListeners} name={`blocks[${blockIndex}].content.lastName` as const}>
							{(field) => <field.TextField className="px-0 font-semibold text-xl sm:text-lg" label="Apellido" />}
						</form.AppField>
					</div>
					<FrameDescription>Información de contacto</FrameDescription>
				</FrameHeader>
				<FramePanel>
					<ul className="grid gap-2 md:grid-cols-3">
						{block.content.items.map((item, itemIndex) => (
							<li
								className="grid gap-1 rounded-full border bg-background px-3 py-2"
								key={itemKeysRef.current[itemIndex]}
							>
								<form.AppField
									listeners={blockListeners}
									name={`blocks[${blockIndex}].content.items[${itemIndex}].kind` as const}
								>
									{(field) => <field.SelectField label="Tipo" options={contactKinds} />}
								</form.AppField>
								<form.AppField
									listeners={blockListeners}
									name={`blocks[${blockIndex}].content.items[${itemIndex}].label` as const}
								>
									{(field) => (
										<field.TextField label="Etiqueta" placeholder={getContactItemLabel(item.kind, item.label)} />
									)}
								</form.AppField>
								<form.AppField
									listeners={blockListeners}
									name={`blocks[${blockIndex}].content.items[${itemIndex}].value` as const}
								>
									{(field) => <field.TextField label="Valor" />}
								</form.AppField>
							</li>
						))}
					</ul>
				</FramePanel>
			</Frame>
		);
	},
});

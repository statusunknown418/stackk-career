"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { ContactEditor } from "./editors/contact-editor";
import { SectionEditor } from "./editors/section-editor";
import type { ResumeAutosave } from "./use-resume-autosave";

export const ResumeDocumentEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		autosave: propType<ResumeAutosave>(),
		blockIndexById: propType<Map<number, number>>(),
		rootBlocks: propType<BlockNode[]>(),
	},
	render: ({ form, autosave, blockIndexById, rootBlocks }) => {
		const contactBlock = rootBlocks.find((block) => block.blockType === "contact");
		const contactIndex = contactBlock ? blockIndexById.get(contactBlock.id) : undefined;
		const sectionBlocks = rootBlocks.filter((block) => block.blockType === "section");

		return (
			<section className="flex w-full max-w-4xl flex-col gap-8 px-11">
				{contactBlock && contactBlock.blockType === "contact" && contactIndex !== undefined ? (
					<ContactEditor autosave={autosave} block={contactBlock} blockIndex={contactIndex} form={form} />
				) : null}

				{sectionBlocks.length > 0 ? (
					<article className="space-y-6">
						{sectionBlocks.map((section) => {
							if (section.blockType !== "section") {
								return null;
							}
							const sectionIndex = blockIndexById.get(section.id);
							if (sectionIndex === undefined) {
								return null;
							}
							return (
								<SectionEditor
									autosave={autosave}
									block={section}
									blockIndex={sectionIndex}
									blockIndexById={blockIndexById}
									form={form}
									key={section.id}
								/>
							);
						})}
					</article>
				) : (
					<p className="text-muted-foreground text-sm">Este CV todavía no tiene secciones.</p>
				)}
			</section>
		);
	},
});

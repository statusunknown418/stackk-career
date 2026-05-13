"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { cn } from "@/lib/utils";
import { getBlockKey } from "./block-key-registry";
import { ContactEditor } from "./editors/contact-editor";
import { SectionEditor } from "./editors/section-editor";

export const ResumeDocumentEditor = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		blockIndexById: propType<Map<number, number>>(),
		focusedSectionId: propType<number | null>(),
		registerSection: propType<(id: number, el: HTMLElement | null) => void>(),
		rootBlocks: propType<BlockNode[]>(),
	},
	render: ({ form, blockIndexById, focusedSectionId, registerSection, rootBlocks }) => {
		const contactBlock = rootBlocks.find((block) => block.blockType === "contact");
		const contactIndex = contactBlock ? blockIndexById.get(contactBlock.id) : undefined;
		const sectionBlocks = rootBlocks.filter((block) => block.blockType === "section");

		return (
			<section className="flex w-full max-w-4xl flex-col gap-10 px-6 pb-10 md:px-8">
				{contactBlock && contactBlock.blockType === "contact" && contactIndex !== undefined && (
					<div
						className={cn(
							"scroll-mt-44 transition-opacity duration-200 ease-out-quint",
							focusedSectionId !== null && focusedSectionId !== contactBlock.id && "opacity-40"
						)}
						ref={(el) => registerSection(contactBlock.id, el)}
					>
						<ContactEditor block={contactBlock} blockIndex={contactIndex} form={form} />
					</div>
				)}

				{sectionBlocks.length ? (
					<article className="flex flex-col gap-12">
						{sectionBlocks.map((section) => {
							if (section.blockType !== "section") {
								return null;
							}

							const isDimmed = focusedSectionId !== null && focusedSectionId !== section.id;

							return (
								<div
									className={cn(
										"scroll-mt-44 transition-opacity duration-200 ease-out-quint",
										isDimmed && "opacity-40"
									)}
									key={getBlockKey(section.id)}
									ref={(el) => registerSection(section.id, el)}
								>
									<SectionEditor block={section} form={form} />
								</div>
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

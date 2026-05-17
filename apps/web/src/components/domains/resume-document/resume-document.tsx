"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { getBlockKey } from "@/components/domains/resume-editor/block-key-registry";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { cn } from "@/lib/utils";
import { InlineContact } from "./inline-contact";
import { InlineSection } from "./inline-section";

export const ResumeDocument = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		blockIndexById: propType<Map<number, number>>(),
		focusedSectionId: propType<number | null>(),
		rootBlocks: propType<BlockNode[]>(),
	},
	render: ({ form, blockIndexById, focusedSectionId, rootBlocks }) => {
		const prefersReducedMotion = useReducedMotion();
		const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());

		useEffect(() => {
			if (focusedSectionId === null) {
				return;
			}
			sectionRefs.current.get(focusedSectionId)?.scrollIntoView({
				behavior: prefersReducedMotion ? "auto" : "smooth",
				block: "start",
			});
		}, [focusedSectionId, prefersReducedMotion]);

		const registerSection = (id: number) => (el: HTMLElement | null) => {
			if (el) {
				sectionRefs.current.set(id, el);
			} else {
				sectionRefs.current.delete(id);
			}
		};

		const contactBlock = rootBlocks.find((block) => block.blockType === "contact");
		const contactIndex = contactBlock ? blockIndexById.get(contactBlock.id) : undefined;
		const sectionBlocks = rootBlocks.filter((block) => block.blockType === "section");

		return (
			<section className="relative mx-auto w-full max-w-3xl [--page-h:80rem]">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_calc(var(--page-h)-1px),hsl(var(--border)/0.4)_calc(var(--page-h)-1px)_var(--page-h))]"
				/>

				<article className="relative flex w-full flex-col gap-10 rounded bg-background p-8 shadow-lg ring-1 ring-border/40">
					{contactBlock && contactBlock.blockType === "contact" && contactIndex !== undefined && (
						<section
							className={cn(
								"scroll-mt-44 transition-opacity duration-200 ease-out-quint",
								focusedSectionId !== null && focusedSectionId !== contactBlock.id && "opacity-40"
							)}
							ref={registerSection(contactBlock.id)}
						>
							<InlineContact block={contactBlock} blockIndex={contactIndex} form={form} />
						</section>
					)}

					{sectionBlocks.length ? (
						sectionBlocks.map((section) => {
							if (section.blockType !== "section") {
								return null;
							}
							const idx = blockIndexById.get(section.id);
							if (idx === undefined) {
								return null;
							}
							const isDimmed = focusedSectionId !== null && focusedSectionId !== section.id;
							return (
								<section
									className={cn(
										"scroll-mt-44 transition-opacity duration-200 ease-out-quint",
										isDimmed && "opacity-40"
									)}
									key={getBlockKey(section.id)}
									ref={registerSection(section.id)}
								>
									<InlineSection block={section} blockIndex={idx} form={form} />
								</section>
							);
						})
					) : (
						<p className="text-muted-foreground text-sm">Este CV todavía no tiene secciones.</p>
					)}
				</article>
			</section>
		);
	},
});

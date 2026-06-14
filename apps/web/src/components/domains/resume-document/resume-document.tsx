"use client";

import type { BlockNode } from "@stackk-career/schemas/db/resume-blocks";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { getBlockKey } from "@/components/domains/resume-document/block-key-registry";
import { propType, resumeFormDefaults, withForm } from "@/lib/forms/resume-form";
import { cn } from "@/lib/utils";
import { InlineContact } from "./inline-contact";
import { InlineSection } from "./inline-section";
import { InsertSectionZone } from "./insert-section-zone";

export const ResumeDocument = withForm({
	defaultValues: resumeFormDefaults,
	props: {
		blockIndexById: propType<Map<number, number>>(),
		focusedSectionId: propType<number | null>(),
		highlightedBlockId: propType<number | null>(),
		highlightedBlockVersion: propType<number>(),
		rootBlocks: propType<BlockNode[]>(),
	},
	render: ({ form, blockIndexById, focusedSectionId, highlightedBlockId, highlightedBlockVersion, rootBlocks }) => {
		const prefersReducedMotion = useReducedMotion();
		const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
		const containerRef = useRef<HTMLElement>(null);

		useEffect(() => {
			if (focusedSectionId === null) {
				return;
			}
			sectionRefs.current.get(focusedSectionId)?.scrollIntoView({
				behavior: prefersReducedMotion ? "auto" : "smooth",
				block: "start",
			});
		}, [focusedSectionId, prefersReducedMotion]);
		useEffect(() => {
			if (highlightedBlockId === null || highlightedBlockVersion === 0) {
				return;
			}

			const target = containerRef.current?.querySelector<HTMLElement>(`[data-block-id="${highlightedBlockId}"]`);

			if (!target) {
				return;
			}

			target.scrollIntoView({
				behavior: prefersReducedMotion ? "auto" : "smooth",
				block: "center",
			});

			if (prefersReducedMotion) {
				return;
			}

			target.removeAttribute("data-block-highlight");
			const handleEnd = () => target.removeAttribute("data-block-highlight");
			const frameId = window.requestAnimationFrame(() => {
				target.setAttribute("data-block-highlight", "");
				target.addEventListener("animationend", handleEnd, { once: true });
			});

			return () => {
				window.cancelAnimationFrame(frameId);
				target.removeEventListener("animationend", handleEnd);
				target.removeAttribute("data-block-highlight");
			};
		}, [highlightedBlockId, highlightedBlockVersion, prefersReducedMotion]);

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
			<section className="relative mx-auto w-full max-w-3xl [--page-h:80rem]" ref={containerRef}>
				<div aria-hidden="true" className="pointer-events-none absolute inset-0" />

				<article className="relative flex w-full flex-col rounded-md bg-card p-8 shadow-inner shadow-muted ring-1 ring-border/40">
					{contactBlock && contactBlock.blockType === "contact" && contactIndex !== undefined && (
						<section
							className={cn(
								"mb-5 scroll-mt-44 transition-opacity delay-100 duration-250 ease-out-quint",
								focusedSectionId !== null && focusedSectionId !== contactBlock.id && "opacity-40"
							)}
							data-block-id={contactBlock.id}
							ref={registerSection(contactBlock.id)}
						>
							<InlineContact block={contactBlock} blockIndex={contactIndex} form={form} />
						</section>
					)}

					{sectionBlocks.length ? (
						sectionBlocks.flatMap((section, sectionIdx) => {
							if (section.blockType !== "section") {
								return [];
							}
							const idx = blockIndexById.get(section.id);
							if (idx === undefined) {
								return [];
							}
							const isDimmed = focusedSectionId !== null && focusedSectionId !== section.id;
							const previousSection = sectionBlocks[sectionIdx - 1];
							const nextSection = sectionBlocks[sectionIdx + 1];
							const nodes = [
								<InsertSectionZone
									form={form}
									key={`zone-before-${getBlockKey(section.id)}`}
									nextPosition={section.position}
									previousPosition={previousSection?.position ?? null}
								/>,
								<section
									className={cn(
										"scroll-mt-44 transition-opacity duration-200 ease-out-quint",
										isDimmed && "opacity-40"
									)}
									data-block-id={section.id}
									key={getBlockKey(section.id)}
									ref={registerSection(section.id)}
								>
									<InlineSection block={section} blockIndex={idx} form={form} />
								</section>,
							];
							if (!nextSection) {
								nodes.push(
									<InsertSectionZone
										form={form}
										key={`zone-after-${getBlockKey(section.id)}`}
										nextPosition={null}
										previousPosition={section.position}
									/>
								);
							}
							return nodes;
						})
					) : (
						<p className="text-muted-foreground text-sm">Este CV todavía no tiene secciones.</p>
					)}
				</article>
			</section>
		);
	},
});

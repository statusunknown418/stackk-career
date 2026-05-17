"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { FAQ_ITEMS } from "./data";

const VISIBLE_FAQ_COUNT = 6;

export function Faq() {
	const [showAll, setShowAll] = useState(false);
	const hasExtras = FAQ_ITEMS.length > VISIBLE_FAQ_COUNT;
	const items = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, VISIBLE_FAQ_COUNT);

	return (
		<section className="px-6 py-16 md:py-24" id="faq">
			<div className="mx-auto mb-12 grid max-w-[1200px] gap-12 md:grid-cols-12">
				<Reveal className="md:col-span-5">
					<span className="font-mono text-[11px] text-foreground/70 uppercase tracking-[0.18em]">FAQ</span>
					<h2 className="mt-3 font-bold font-display text-[clamp(2rem,4.4vw,3.25rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
						<WordReveal>Preguntas frecuentes.</WordReveal>
					</h2>
					<p className="mt-5 max-w-[420px] text-[1rem] text-foreground/65 leading-[1.55]">
						Si tu duda no está aquí, escríbenos por WhatsApp o desde el dashboard. Responde una persona del equipo en
						menos de 24 horas. Nunca un bot.
					</p>
				</Reveal>

				<div className="md:col-span-7">
					<Accordion className="flex flex-col">
						{items.map((item, idx) => (
							<AccordionItem
								className="border-foreground/10 border-b last:border-b-0"
								key={item.q}
								value={`faq-${idx}`}
							>
								<AccordionTrigger className="group/item flex w-full items-baseline py-5 text-left hover:no-underline">
									<span className="flex-1 font-display font-medium text-[1.1rem] text-foreground leading-snug tracking-[-0.015em]">
										{item.q}
									</span>
								</AccordionTrigger>
								<AccordionContent className="pb-6 text-[15px] text-foreground/70 leading-[1.6]">
									{item.a}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>

					{hasExtras && (
						<button
							className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/12 bg-card/60 px-4 py-2 font-medium text-[13px] text-foreground/75 transition-all hover:border-foreground/25 hover:bg-card hover:text-foreground"
							onClick={() => setShowAll((v) => !v)}
							type="button"
						>
							<CaretDownIcon
								className={`transition-transform duration-300 ${showAll ? "rotate-180" : ""}`}
								size={12}
								weight="bold"
							/>
							{showAll ? "Ocultar preguntas" : `Ver ${FAQ_ITEMS.length - VISIBLE_FAQ_COUNT} preguntas más`}
						</button>
					)}
				</div>
			</div>
		</section>
	);
}

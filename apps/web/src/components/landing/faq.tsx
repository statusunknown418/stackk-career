import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";
import { FAQ_ITEMS } from "./data";

export function Faq() {
	return (
		<section className="px-6 py-32" id="faq">
			<div className="mx-auto mb-14 grid max-w-[1200px] gap-12 md:grid-cols-12">
				<Reveal className="md:col-span-5">
					<span className="text-foreground/55 text-sm">FAQ</span>
					<h2 className="mt-4 font-bold font-display text-[clamp(2.4rem,5.6vw,4rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
						Preguntas frecuentes.
					</h2>
					<p className="mt-6 max-w-[420px] text-[1.05rem] text-foreground/65 leading-[1.55]">
						Si tu duda no está aquí, escríbenos por WhatsApp o desde el dashboard. Responde una persona del equipo en
						menos de 24 horas — nunca un bot.
					</p>
				</Reveal>

				<div className="md:col-span-7">
					<Accordion className="flex flex-col">
						{FAQ_ITEMS.map((item, idx) => (
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
				</div>
			</div>
		</section>
	);
}

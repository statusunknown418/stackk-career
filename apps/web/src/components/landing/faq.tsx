import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ_ITEMS } from "./data";

export function Faq() {
	return (
		<section className="px-6 py-32" id="faq">
			<div className="mx-auto mb-14 grid max-w-[1100px] gap-12 md:grid-cols-12">
				<div className="md:col-span-5">
					<div className="flex items-center gap-3">
						<span className="font-mono text-[11px] text-oxblood uppercase tabular-nums tracking-[0.22em]">§06</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">FAQ</span>
					</div>
					<h2 className="mt-5 font-bold font-display text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1] tracking-[-0.035em]">
						Preguntas <span className="font-display-italic font-semibold text-oxblood">frecuentes</span>.
					</h2>
					<p className="mt-5 text-[15px] text-foreground/70 leading-[1.55]">
						Si tu duda no está acá, escribinos por WhatsApp o desde el dashboard. Responde una persona del equipo en
						menos de 24 horas — nunca un bot.
					</p>
				</div>

				<div className="md:col-span-7">
					<Accordion className="flex flex-col">
						{FAQ_ITEMS.map((item, idx) => (
							<AccordionItem
								className="border-foreground/10 border-b last:border-b-0"
								key={item.q}
								value={`faq-${idx}`}
							>
								<AccordionTrigger className="group/item flex w-full items-baseline gap-4 py-5 text-left hover:no-underline">
									<span className="font-mono text-[11px] text-oxblood uppercase tabular-nums tracking-[0.16em]">
										Q.{String(idx + 1).padStart(2, "0")}
									</span>
									<span className="flex-1 font-bold font-display text-[1.05rem] text-foreground leading-snug tracking-[-0.015em]">
										{item.q}
									</span>
								</AccordionTrigger>
								<AccordionContent className="pb-6 pl-[3.4rem] text-[15px] text-foreground/75 leading-[1.6]">
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

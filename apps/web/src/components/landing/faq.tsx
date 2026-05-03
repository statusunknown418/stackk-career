import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ_ITEMS } from "./data";

export function Faq() {
	return (
		<section className="px-6 py-32" id="faq">
			<div className="mx-auto mb-14 grid max-w-[1100px] gap-12 md:grid-cols-12">
				<div className="md:col-span-5">
					<div className="flex items-center gap-3">
						<span className="font-display-italic text-2xl text-oxblood leading-none">§07</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">Preguntas</span>
					</div>
					<h2 className="mt-5 font-display font-medium text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[0.98] tracking-[-0.04em]">
						Todo lo que necesitás <span className="font-display-italic font-light text-oxblood">saber.</span>
					</h2>
					<p className="mt-5 font-serif text-foreground/70 text-lg leading-[1.5]">
						Si tu duda no está acá, escribinos. Respondemos en menos de 24 horas — siempre una persona del equipo, nunca
						un bot.
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
									<span className="flex-1 font-display font-medium text-[1.1rem] text-foreground leading-snug tracking-[-0.015em]">
										{item.q}
									</span>
								</AccordionTrigger>
								<AccordionContent className="pb-6 pl-[3.4rem] font-serif text-[1.05rem] text-foreground/75 leading-[1.55]">
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

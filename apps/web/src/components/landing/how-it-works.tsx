"use client";

import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/ui/reveal";
import { HOW_STEPS } from "./data";

export function HowItWorks() {
	const reduced = useReducedMotion();
	return (
		<section className="px-6 py-32" id="camino">
			<Reveal>
				<header className="mx-auto mb-20 max-w-[1200px]">
					<span className="text-foreground/55 text-sm">Cómo funciona</span>
					<h2 className="mt-4 max-w-[900px] font-bold font-display text-[clamp(2.4rem,5.6vw,4.5rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
						De CV ignorado a oferta firmada.
					</h2>
					<p className="mt-6 max-w-[620px] text-[1.05rem] text-foreground/65 leading-[1.55]">
						Las herramientas IA hacen el trabajo de fondo. El coach hace que cada paso cuente. Resultado: ofertas reales
						en semanas, no meses.
					</p>
				</header>
			</Reveal>

			<ol className="mx-auto grid max-w-[1200px] grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-3">
				{HOW_STEPS.map((step, idx) => (
					<motion.li
						className="flex flex-col border-foreground/10 border-t pt-6"
						initial={reduced ? false : { opacity: 0, y: 24 }}
						key={step.title}
						transition={reduced ? { duration: 0 } : { duration: 0.7, delay: (idx % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
						viewport={{ once: false, margin: "-12% 0px -12% 0px" }}
						whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
					>
						<span className="font-display font-medium text-[15px] text-foreground/40 tabular-nums">
							{String(idx + 1).padStart(2, "0")}
						</span>
						<h3 className="mt-3 font-display font-semibold text-[1.4rem] text-foreground leading-[1.2] tracking-[-0.02em]">
							{step.title}
						</h3>
						<p className="mt-3 text-[15px] text-foreground/65 leading-[1.6]">{step.body}</p>
						{step.tag && <span className="mt-4 text-foreground/45 text-xs">Disponible en {step.tag}</span>}
					</motion.li>
				))}
			</ol>
		</section>
	);
}

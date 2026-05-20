"use client";

import { SparkleIcon, UserIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

interface Tool {
	body: string;
	index: string;
	kind: "ia" | "humano";
	name: string;
}

const TOOLS: readonly Tool[] = [
	{
		index: "01",
		name: "Score CV",
		body: "Puntaje de 0 a 100 por rol, con la lista exacta de qué mejorar.",
		kind: "ia",
	},
	{
		index: "02",
		name: "Reescritura con IA",
		body: "Reescribe tus secciones débiles. Logros con número, no tareas.",
		kind: "ia",
	},
	{ index: "03", name: "Cartas de presentación", body: "Una carta distinta por cada oferta, en segundos.", kind: "ia" },
	{
		index: "04",
		name: "Optimizador de LinkedIn",
		body: "Tu perfil alineado a lo que buscan los reclutadores.",
		kind: "ia",
	},
	{
		index: "05",
		name: "Mensajes a reclutadores",
		body: "Plantillas que sí responden, listas para enviar.",
		kind: "ia",
	},
	{
		index: "06",
		name: "Coach humano 1:1",
		body: "Un senior real, con planilla, que ya contrató en tu sector. La diferencia que ninguna IA reemplaza.",
		kind: "humano",
	},
];

export function Tools() {
	return (
		<section className="relative border-border border-b px-6 py-20 md:py-28" id="herramientas">
			<div className="mx-auto max-w-[1200px]">
				<Reveal>
					<header className="mb-12 grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
						<div className="md:col-span-8">
							<div className="flex items-center gap-2.5 font-mono text-[11px] text-foreground/60 uppercase tracking-[0.22em]">
								<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
								<span>Todo lo que necesitas</span>
							</div>
							<h2 className="mt-4 max-w-[16ch] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
								<WordReveal>Cinco herramientas con IA. Un coach de verdad.</WordReveal>
							</h2>
						</div>
						<p className="text-[1rem] text-foreground/65 leading-[1.55] md:col-span-4">
							Todo en una sola suscripción, desde S/79 al mes. Cancelas cuando quieras.
						</p>
					</header>
				</Reveal>

				<ol className="flex flex-col">
					{TOOLS.map((tool, idx) => (
						<ToolRow idx={idx} key={tool.index} tool={tool} />
					))}
				</ol>
			</div>
		</section>
	);
}

function ToolRow({ idx, tool }: { idx: number; tool: Tool }) {
	const reduced = useReducedMotion();
	const isHuman = tool.kind === "humano";

	return (
		<motion.li
			className={
				isHuman
					? "group relative grid grid-cols-1 items-center gap-3 overflow-hidden rounded-2xl border border-oxblood/40 bg-oxblood/[0.06] px-5 py-7 md:grid-cols-[auto_1fr_auto] md:gap-8 md:px-7 md:py-9"
					: "group grid grid-cols-1 items-center gap-3 border-border border-t px-1 py-6 transition-colors duration-300 hover:bg-foreground/[0.02] md:grid-cols-[auto_1fr_auto] md:gap-8 md:py-7"
			}
			initial={reduced ? false : { opacity: 0, y: 18 }}
			transition={{ duration: 0.6, delay: idx * 0.06, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-12% 0px", once: true }}
			whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
		>
			<div className="flex items-center gap-4">
				<span
					className={
						isHuman
							? "font-bold font-display text-[clamp(2rem,3vw,2.75rem)] text-oxblood tabular-nums leading-none tracking-[-0.04em]"
							: "font-bold font-display text-[clamp(2rem,3vw,2.75rem)] text-foreground/25 tabular-nums leading-none tracking-[-0.04em] transition-colors duration-300 group-hover:text-foreground/45"
					}
				>
					{tool.index}
				</span>
				<h3
					className={
						isHuman
							? "font-display font-semibold text-[1.4rem] text-foreground leading-tight tracking-[-0.02em] md:text-[1.65rem]"
							: "font-display font-semibold text-[1.25rem] text-foreground leading-tight tracking-[-0.02em] md:hidden"
					}
				>
					{tool.name}
				</h3>
			</div>

			{!isHuman && (
				<h3 className="hidden font-display font-semibold text-[1.4rem] text-foreground leading-tight tracking-[-0.02em] md:block">
					{tool.name}
				</h3>
			)}

			<p
				className={
					isHuman
						? "max-w-[52ch] text-[14.5px] text-foreground/75 leading-[1.55] md:text-[15px]"
						: "max-w-[44ch] text-[14px] text-foreground/60 leading-[1.55]"
				}
			>
				{tool.body}
			</p>

			<span
				className={
					isHuman
						? "inline-flex w-fit items-center gap-1.5 rounded-full bg-oxblood px-2.5 py-1 font-medium font-mono text-[9.5px] text-background uppercase tracking-[0.16em]"
						: "inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[9.5px] text-foreground/55 uppercase tracking-[0.16em]"
				}
			>
				{isHuman ? <UserIcon size={11} weight="bold" /> : <SparkleIcon size={11} weight="fill" />}
				{isHuman ? "Humano" : "IA"}
			</span>
		</motion.li>
	);
}

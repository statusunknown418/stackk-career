"use client";

import {
	ChatTeardropDotsIcon,
	ClockIcon,
	EnvelopeSimpleIcon,
	GaugeIcon,
	type Icon,
	LinkedinLogoIcon,
	PenNibIcon,
	SparkleIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

interface Tool {
	body: string;
	icon: Icon;
	index: string;
	kind: "ia" | "humano";
	name: string;
	plan: string;
	soon?: boolean;
}

const TOOLS: readonly Tool[] = [
	{
		index: "01",
		name: "Score CV",
		plan: "Todos los planes",
		body: "Sube tu CV. Un Agente especializado de IA lo califica de 0 a 100, con la lista exacta de qué corregir para que no te descarten.",
		icon: GaugeIcon,
		kind: "ia",
	},
	{
		index: "02",
		name: "Reescritura con IA",
		plan: "Pro y Premium",
		body: "Nuestro Agente especializado de IA reescribe tus puntos débiles y los reestructura con las métricas clave que buscan los reclutadores y los filtros automáticos que descartan CVs.",
		icon: PenNibIcon,
		kind: "ia",
	},
	{
		index: "03",
		name: "Cartas de presentación",
		plan: "Pro y Premium",
		body: "Una carta distinta por cada oferta, en segundos.",
		icon: EnvelopeSimpleIcon,
		kind: "ia",
	},
	{
		index: "04",
		name: "Optimizador de LinkedIn",
		plan: "Pro y Premium",
		body: "Optimizamos tu experiencia, certificaciones y todo tu perfil de LinkedIn para que los reclutadores te escriban a ti, ofreciéndote trabajo.",
		icon: LinkedinLogoIcon,
		kind: "ia",
		soon: true,
	},
	{
		index: "05",
		name: "Mensajes a reclutadores",
		plan: "Premium",
		body: "El primer mensaje y el seguimiento, escritos para que el reclutador realmente conteste.",
		icon: ChatTeardropDotsIcon,
		kind: "ia",
		soon: true,
	},
	{
		index: "06",
		name: "Coach humano 1:1",
		plan: "Premium",
		body: "Un senior de tu sector que pasó por lo mismo que tú. La preparación 1:1 que ninguna IA puede reemplazar.",
		icon: UserIcon,
		kind: "humano",
	},
];

export function Tools() {
	return (
		<section className="relative border-border border-y bg-foreground/[0.025] px-6 py-20 md:py-28" id="herramientas">
			<div className="mx-auto max-w-7xl">
				<Reveal>
					<header className="mb-12 grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
						<div className="md:col-span-8">
							<div className="flex items-center gap-3 font-mono text-foreground/60 text-xs uppercase">
								<span aria-hidden="true" className="h-px w-7 bg-oxblood" />
								<span>Todo lo que necesitas</span>
							</div>
							<h2 className="mt-4 max-w-[16ch] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-none tracking-tight">
								<WordReveal>Herramientas con IA. Un coach de verdad.</WordReveal>
							</h2>
						</div>
					</header>
				</Reveal>

				<ol className="flex flex-col gap-2 md:-mx-5">
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
	const isSoon = tool.soon ?? false;
	const ToolIcon = tool.icon;

	// Icon badge — green for the human coach, dashed/dimmed for tools that
	// aren't live yet, neutral with a green hover for active AI tools.
	let iconClass =
		"grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground/70 transition-colors duration-300 group-hover:border-oxblood/50 group-hover:bg-oxblood/10 group-hover:text-oxblood";
	if (isHuman) {
		iconClass = "grid size-12 shrink-0 place-items-center rounded-xl bg-oxblood text-neutral-950";
	} else if (isSoon) {
		iconClass =
			"grid size-12 shrink-0 place-items-center rounded-xl border border-border border-dashed bg-card text-foreground/40 transition-colors duration-300 group-hover:border-oxblood/50 group-hover:bg-oxblood/10 group-hover:text-oxblood";
	}

	// Status tag — Humano / Muy pronto / IA. Computed to avoid nested ternaries.
	let TagIcon: Icon = SparkleIcon;
	let tagLabel = "IA";
	let tagWeight: "bold" | "fill" = "fill";
	let tagClass =
		"col-span-2 inline-flex w-fit items-center gap-1.5 self-start rounded-full border border-border px-2.5 py-1 font-mono text-xs text-foreground/55 uppercase md:col-span-1 md:justify-self-end md:self-center";
	if (isHuman) {
		TagIcon = UserIcon;
		tagLabel = "Humano";
		tagWeight = "bold";
		tagClass =
			"col-span-2 inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-oxblood px-2.5 py-1 font-medium font-mono text-xs text-neutral-950 uppercase md:col-span-1 md:justify-self-end md:self-center";
	} else if (isSoon) {
		TagIcon = ClockIcon;
		tagLabel = "Muy pronto";
		tagWeight = "bold";
		tagClass =
			"col-span-2 inline-flex w-fit items-center gap-1.5 self-start rounded-full border border-foreground/30 border-dashed px-2.5 py-1 font-mono text-xs text-foreground/60 uppercase md:col-span-1 md:justify-self-end md:self-center";
	}

	return (
		<motion.li
			className={
				isHuman
					? "group grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 rounded-2xl border border-oxblood/40 bg-oxblood/[0.06] px-5 py-6 md:mx-5 md:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1fr)_8.5rem] md:gap-x-8 md:py-7"
					: "group grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2 rounded-2xl border border-transparent px-5 py-5 transition-all duration-300 ease-out hover:border-border hover:bg-foreground/[0.03] md:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1fr)_8.5rem] md:gap-x-8 md:py-6"
			}
			initial={reduced ? false : { opacity: 0, y: 18 }}
			transition={{ duration: 0.6, delay: idx * 0.06, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-12% 0px", once: true }}
			whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
		>
			{/* Icon badge — replaces the repeated index numbers with a per-tool glyph */}
			<span className={iconClass}>
				<ToolIcon size={22} weight={isHuman ? "fill" : "duotone"} />
			</span>

			{/* Title + index */}
			<div className="flex flex-col">
				<span className="font-mono text-foreground/35 text-xs uppercase tabular-nums">{tool.index} / 06</span>
				<h3
					className={`mt-1 font-display font-semibold leading-tight tracking-tight ${
						isHuman ? "text-[1.35rem] text-foreground md:text-[1.5rem]" : "text-foreground text-xl"
					}`}
				>
					{tool.name}
				</h3>
				<span className="mt-1.5 font-mono text-foreground/45 text-xs uppercase transition-colors duration-300 group-hover:text-oxblood">
					{tool.plan}
				</span>
			</div>

			{/* Description */}
			<p
				className={`col-span-2 max-w-[44ch] text-sm leading-relaxed md:col-span-1 ${
					isHuman ? "text-foreground/75 md:text-base" : "text-foreground/60"
				}`}
			>
				{tool.body}
			</p>

			{/* Status tag */}
			<span className={tagClass}>
				<TagIcon size={11} weight={tagWeight} />
				{tagLabel}
			</span>
		</motion.li>
	);
}

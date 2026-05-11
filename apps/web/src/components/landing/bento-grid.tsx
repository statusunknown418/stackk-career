"use client";

import { ChatTeardropDotsIcon, FileTextIcon, LinkedinLogoIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";
import { HERO_CHART } from "./data";

export function BentoGrid() {
	return (
		<section className="px-6 py-32" id="features">
			<Reveal>
				<header className="mx-auto mb-20 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/55 uppercase tracking-[0.18em]">— Producto</span>
					<h2 className="mt-4 max-w-[900px] font-bold font-display text-[clamp(2.4rem,5.6vw,4.5rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
						<WordReveal>Seis herramientas. Una sola suscripción.</WordReveal>
					</h2>
					<p className="mt-6 max-w-[620px] text-[1.05rem] text-foreground/65 leading-[1.55]">
						Score CV, rewrite con IA, cartas, LinkedIn y outreach — más coaching humano — en un solo plan, en español.
					</p>
				</header>
			</Reveal>

			<div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-3 [grid-auto-rows:minmax(200px,auto)] md:grid-cols-6">
				<BentoCellHero />
				<BentoCellPlain
					body="Sube tu CV o constrúyelo desde cero. La IA convierte tareas en logros con métricas. Score inmediato al terminar."
					className="col-span-2 md:col-span-2"
					icon={<FileTextIcon size={18} weight="duotone" />}
					title="Constructor de CV"
				/>
				<BentoCellPlain
					body="Pega la oferta + tu CV. Carta personalizada en 30 segundos. 1/mes en Gratuito, ilimitadas en Pro."
					className="col-span-2 md:col-span-2"
					icon={<PaperPlaneTiltIcon size={18} weight="duotone" />}
					iconClassName="bg-foreground/10 text-foreground"
					title="Carta de presentación"
				/>
				<BentoCellLinkedIn />
				<BentoCellNetwork />
				<BentoCellCoaching />
			</div>
		</section>
	);
}

function BentoCellHero() {
	return (
		<div className="group/cell relative col-span-2 flex flex-col overflow-hidden rounded-2xl bg-foreground p-8 text-background transition-transform duration-300 ease-out hover:-translate-y-1 md:col-span-4 md:row-span-2">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-50"
				style={{
					backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
					backgroundSize: "14px 14px",
				}}
			/>
			<h3 className="relative z-10 font-bold font-display text-[clamp(1.9rem,3vw,2.6rem)] text-background leading-[1.05] tracking-[-0.03em]">
				Score CV con IA.
				<br />
				De <CountUp className="tabular-nums" to={47} /> a <CountUp className="tabular-nums" to={95} /> promedio.
			</h3>
			<p className="relative z-10 mt-4 max-w-[520px] text-background/70 text-sm leading-[1.55]">
				Subes tu CV. La IA lo evalúa en estructura, logros con métricas, keywords del sector y compatibilidad con
				sistemas ATS. En 30 segundos tienes un puntaje 0–100 y la lista exacta de qué arreglar.
			</p>
			<p className="relative z-10 mt-3 max-w-[520px] text-background/70 text-sm leading-[1.55]">
				En Pro: comparas tu CV contra la oferta específica y la IA reescribe las secciones débiles.
			</p>

			<div className="relative z-10 mt-auto pt-8">
				<div className="mb-3 flex h-28 items-end gap-1.5">
					{HERO_CHART.map((bar, idx) => (
						<motion.div
							className={cn("flex-1 rounded-t-[2px]", bar.high ? "bg-oxblood" : "bg-background/15")}
							initial={{ height: 0 }}
							key={`bar-${bar.heightPct}-${String(bar.high)}`}
							transition={{ duration: 0.7, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
							viewport={{ once: false, margin: "-15% 0px -15% 0px" }}
							whileInView={{ height: `${bar.heightPct}%` }}
						/>
					))}
				</div>
				<div className="flex items-center justify-between text-[12px] text-background/50">
					<span>Día 1</span>
					<span>Día 7</span>
				</div>
			</div>
		</div>
	);
}

function BentoCellLinkedIn() {
	return (
		<div className="relative col-span-2 flex flex-col rounded-2xl border border-foreground/10 bg-card p-7 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20 md:col-span-3">
			<span className="mb-5 grid size-10 place-items-center rounded-lg bg-foreground/8 text-foreground">
				<LinkedinLogoIcon size={20} weight="duotone" />
			</span>
			<h3 className="font-display font-semibold text-[1.4rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				Optimizador de LinkedIn
			</h3>
			<p className="mt-3 text-foreground/65 text-sm leading-[1.55]">
				Headline, About y bullets de cada experiencia con score de perfil. En LATAM, los reclutadores filtran por
				LinkedIn antes que por CV — optimizarlo abre la puerta.
			</p>

			<div className="mt-auto pt-6">
				<div className="rounded-lg border border-foreground/10 bg-background/40 p-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-foreground/60">Score de perfil</span>
						<span className="font-semibold text-foreground tabular-nums">62 → 91</span>
					</div>
					<div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/8">
						<div className="h-full w-[91%] rounded-full bg-oxblood" />
					</div>
				</div>
			</div>
		</div>
	);
}

function BentoCellNetwork() {
	return (
		<div className="relative col-span-2 flex flex-col rounded-2xl border border-foreground/10 bg-card p-7 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20 md:col-span-3">
			<span className="mb-5 grid size-10 place-items-center rounded-lg bg-foreground/8 text-foreground">
				<ChatTeardropDotsIcon size={20} weight="duotone" />
			</span>
			<h3 className="font-display font-semibold text-[1.4rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				Mensajes de outreach
			</h3>
			<p className="mt-3 text-foreground/65 text-sm leading-[1.55]">
				Mensajes que abren conversaciones, no que parecen plantilla. 1/mes en Gratuito, ilimitados en Pro.
			</p>

			<div className="mt-auto pt-6">
				<div className="rounded-lg border border-foreground/10 bg-background/40 p-3 text-[13px] text-foreground/80 leading-[1.5]">
					“Hola Camila, vi que lideraste el squad de growth en Yape. Postulo al rol de PM Jr. y me interesa entender…”
				</div>
			</div>
		</div>
	);
}

function BentoCellCoaching() {
	return (
		<div className="relative col-span-2 flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card p-8 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20 md:col-span-6">
			<div className="grid items-end gap-8 md:grid-cols-12">
				<div className="md:col-span-7">
					<h3 className="font-bold font-display text-[clamp(1.6rem,2.6vw,2.2rem)] text-foreground leading-[1.05] tracking-[-0.025em]">
						Coaching 1:1 humano. No lo pagas aparte.
					</h3>
					<p className="mt-4 max-w-[560px] text-[15px] text-foreground/65 leading-[1.55]">
						3 a 5 coaches senior en planilla — no freelancers de plataforma. Sesión 1:1 en Pro (1/mes) o el camino
						completo en Premium (3 sesiones + WhatsApp con tu coach).
					</p>
				</div>

				<div className="md:col-span-4 md:col-start-9">
					<div className="rounded-xl border border-foreground/10 bg-background/40 p-5">
						<div className="flex items-center justify-between border-foreground/10 border-b pb-3">
							<span className="text-foreground/60 text-sm">Otros servicios</span>
							<span className="text-foreground/40 line-through">US$699+</span>
						</div>
						<div className="flex items-center justify-between pt-3">
							<span className="text-foreground/60 text-sm">IMPULSA Pro</span>
							<span className="font-semibold text-foreground">S/79 / mes</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function BentoCellPlain({
	icon,
	title,
	body,
	className,
	iconClassName,
}: {
	icon: ReactNode;
	title: string;
	body: string;
	className?: string;
	iconClassName?: string;
}) {
	return (
		<div
			className={cn(
				"relative flex flex-col rounded-2xl border border-foreground/10 bg-card p-7 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20",
				className
			)}
		>
			<span
				className={cn("mb-5 grid size-10 place-items-center rounded-lg bg-foreground/8 text-foreground", iconClassName)}
			>
				{icon}
			</span>
			<h3 className="mb-3 font-display font-semibold text-[1.25rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				{title}
			</h3>
			<p className="text-[14px] text-foreground/65 leading-[1.55]">{body}</p>
		</div>
	);
}

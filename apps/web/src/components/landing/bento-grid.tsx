"use client";

import { ChatTeardropDotsIcon, FileTextIcon, LinkedinLogoIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";
import { HERO_CHART, WHY_REASONS, type WhyReason } from "./data";

export function BentoGrid() {
	return (
		<section className="px-6 py-16 md:py-24" id="features">
			<Reveal>
				<header className="mx-auto mb-12 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/70 uppercase tracking-[0.18em]">
						Por qué + Producto
					</span>
					<h2 className="mt-3 max-w-[860px] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
						<WordReveal>Todo lo que LATAM no tenía. En un solo plan.</WordReveal>
					</h2>
					<p className="mt-5 max-w-[620px] text-[1rem] text-foreground/65 leading-[1.55]">
						Cuatro razones por las que funciona y seis herramientas en una sola suscripción.
					</p>
				</header>
			</Reveal>

			<div className="mx-auto mb-12 grid max-w-[1200px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{WHY_REASONS.map((reason, idx) => (
					<Reveal delay={idx * 0.06} key={reason.number}>
						<ReasonCompactCard reason={reason} />
					</Reveal>
				))}
			</div>

			<div className="mx-auto mb-6 max-w-[1200px]">
				<span className="font-mono text-[10px] text-foreground/70 uppercase tracking-[0.2em]">Las 6 herramientas</span>
			</div>

			<div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-3 [grid-auto-rows:minmax(180px,auto)] sm:grid-cols-2 md:grid-cols-6">
				<BentoCellHero />
				<BentoCellPlain
					body="Sube tu CV o constrúyelo de cero. La IA convierte tareas en logros medibles. Score al instante."
					className="md:col-span-2"
					icon={<FileTextIcon size={18} weight="duotone" />}
					title="Constructor de CV"
				/>
				<BentoCellPlain
					body="Pega el anuncio + tu CV. Carta personalizada en 30 segundos. Una al mes en Gratuito, ilimitadas en Pro."
					className="md:col-span-2"
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

function ReasonCompactCard({ reason }: { reason: WhyReason }) {
	return (
		<article className="group flex h-full flex-col gap-3.5 rounded-2xl border border-foreground/8 bg-card/50 p-5 transition-colors duration-300 hover:border-foreground/18 hover:bg-card/85">
			<header className="flex items-baseline justify-between">
				<span className="font-mono text-[10px] text-foreground/70 uppercase tracking-[0.18em]">
					Razón {reason.number}
				</span>
				<span className="font-display-italic font-light text-[28px] text-foreground/15 leading-none">
					{reason.number}
				</span>
			</header>
			<h3 className="font-display font-semibold text-[1.05rem] text-foreground leading-[1.2] tracking-[-0.02em]">
				{reason.title} <span className="font-display-italic font-light text-oxblood">{reason.emphasis}</span>
			</h3>
			<p className="flex-1 text-[13px] text-foreground/65 leading-[1.55]">{reason.body}</p>
			<footer className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-foreground/8 border-t pt-3">
				<span className="font-mono text-[9px] text-foreground/70 uppercase tracking-[0.14em]">
					{reason.receipt.label}
				</span>
				<span className="font-display font-medium text-[11px] text-foreground tracking-tight">
					{reason.receipt.value}
				</span>
			</footer>
		</article>
	);
}

function BentoCellHero() {
	const cellRef = useRef<HTMLDivElement>(null);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const el = cellRef.current;
		if (!el) {
			return;
		}
		const r = el.getBoundingClientRect();
		el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
		el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
	};

	return (
		<div
			className="group/cell relative flex flex-col overflow-hidden rounded-2xl bg-foreground p-6 text-background transition-transform duration-300 ease-out hover:-translate-y-1 sm:col-span-2 sm:p-8 md:col-span-4 md:row-span-2"
			onMouseMove={handleMouseMove}
			ref={cellRef}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-50"
				style={{
					backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
					backgroundSize: "14px 14px",
				}}
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/cell:opacity-100"
				style={{
					background:
						"radial-gradient(540px circle at var(--spot-x, 50%) var(--spot-y, 50%), oklch(from var(--oxblood) l c h / 0.32), transparent 60%)",
				}}
			/>
			<h3 className="relative z-10 break-words font-bold font-display text-[clamp(1.5rem,3.6vw,2.6rem)] text-background leading-[1.05] tracking-[-0.03em]">
				Score CV con IA.
				<br />
				De <CountUp className="tabular-nums" to={47} /> a <CountUp className="tabular-nums" to={95} /> en una semana.
			</h3>
			<p className="relative z-10 mt-4 max-w-[520px] text-background/70 text-sm leading-[1.55]">
				Sube tu CV. En 30 segundos: score de 0 a 100, lista exacta de qué cambiar y cómo pasar los filtros automáticos
				de reclutadores.
			</p>
			<p className="relative z-10 mt-3 max-w-[520px] text-background/70 text-sm leading-[1.55]">
				En Pro, la IA reescribe las secciones débiles contra cada oferta concreta.
			</p>

			<div className="relative z-10 mt-auto pt-8">
				<div className="relative mb-3 flex h-28 items-end gap-1.5 overflow-hidden">
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
					<motion.span
						animate={{ x: ["0%", "100%"] }}
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-marigold to-transparent shadow-[0_0_12px_oklch(from_var(--marigold)_l_c_h/0.65)] motion-reduce:hidden"
						transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
					/>
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
		<div className="relative flex flex-col rounded-2xl border border-foreground/10 bg-card p-6 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20 sm:col-span-2 sm:p-7 md:col-span-3">
			<span className="mb-5 grid size-10 place-items-center rounded-lg bg-foreground/8 text-foreground">
				<LinkedinLogoIcon size={20} weight="duotone" />
			</span>
			<h3 className="font-display font-semibold text-[1.4rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				Optimizador de LinkedIn
			</h3>
			<p className="mt-3 text-foreground/65 text-sm leading-[1.55]">
				Optimizamos tu titular, la sección Acerca de y la descripción de cada experiencia, todo con score del perfil. En
				LATAM, los reclutadores miran tu LinkedIn antes que tu CV: si tu perfil no destaca en los primeros segundos,
				ningún reclutador real llega a ver tu CV.
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
		<div className="relative flex flex-col rounded-2xl border border-foreground/10 bg-card p-6 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20 sm:col-span-2 sm:p-7 md:col-span-3">
			<span className="mb-5 grid size-10 place-items-center rounded-lg bg-foreground/8 text-foreground">
				<ChatTeardropDotsIcon size={20} weight="duotone" />
			</span>
			<h3 className="font-display font-semibold text-[1.4rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				Mensajes a reclutadores
			</h3>
			<p className="mt-3 text-foreground/65 text-sm leading-[1.55]">
				Mensajes que abren conversaciones, no copia y pega. Uno al mes en Gratuito, ilimitados en Pro.
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
		<div className="relative flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card p-6 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20 sm:col-span-2 sm:p-8 md:col-span-6">
			<div className="grid items-end gap-8 md:grid-cols-12">
				<div className="md:col-span-7">
					<h3 className="font-bold font-display text-[clamp(1.6rem,2.6vw,2.2rem)] text-foreground leading-[1.05] tracking-[-0.025em]">
						Coaching humano. Incluido, no aparte.
					</h3>
					<p className="mt-4 max-w-[560px] text-[15px] text-foreground/65 leading-[1.55]">
						Con Pro tienes una sesión 1:1 al mes sobre el tema que tú elijas. Con Premium llevas el camino completo:
						mapeo de puesto, simulacro de entrevista y refuerzo posterior, además de WhatsApp directo con tu coach.
					</p>
				</div>

				<div className="md:col-span-4 md:col-start-9">
					<div className="rounded-xl border border-foreground/10 bg-background/40 p-5">
						<div className="flex items-center justify-between border-foreground/10 border-b pb-3">
							<span className="text-foreground/60 text-sm">Otros servicios</span>
							<span className="text-foreground/60 line-through">US$699+</span>
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
				"relative flex flex-col rounded-2xl border border-foreground/10 bg-card p-6 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/20 sm:p-7",
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

import {
	ChatTeardropDotsIcon,
	FileTextIcon,
	HandshakeIcon,
	LinkedinLogoIcon,
	PaperPlaneTiltIcon,
	SparkleIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HERO_CHART } from "./data";

export function BentoGrid() {
	return (
		<section className="px-6 py-32" id="features">
			<div className="mx-auto mb-16 grid max-w-[1200px] gap-6 md:grid-cols-12">
				<div className="md:col-span-6">
					<SectionLabel number="02">Features</SectionLabel>
					<h2 className="mt-5 font-bold font-display text-[clamp(2.2rem,4.4vw,3.6rem)] text-foreground leading-[1] tracking-[-0.035em]">
						Seis herramientas. <br />
						Una <span className="font-display-italic font-semibold text-oxblood">sola</span> suscripción.
					</h2>
				</div>
				<div className="flex items-end md:col-span-5 md:col-start-8">
					<p className="text-balance text-[1.15rem] text-foreground/75 leading-[1.55]">
						Todo lo que ofrecen Wonsulting, ResumAI, CoverLetterAI y NetworkAI —{" "}
						<span className="font-semibold text-foreground">más coaching humano</span> — en un solo plan, en español.
					</p>
				</div>
			</div>

			<div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-3 [grid-auto-rows:minmax(200px,auto)] md:grid-cols-6">
				<BentoCellHero />
				<BentoCellPlain
					body="Subí tu CV o construilo desde cero. La IA convierte tareas en logros con métricas. Score inmediato al terminar."
					className="col-span-2 md:col-span-2"
					icon={<FileTextIcon size={18} weight="duotone" />}
					marginalia="02"
					title="Constructor de CV IA."
				/>
				<BentoCellPlain
					body="Pegá la oferta + tu CV. Carta personalizada en 30 segundos. 1/mes en Free, ilimitadas en Pro."
					className="col-span-2 md:col-span-2"
					icon={<PaperPlaneTiltIcon size={18} weight="duotone" />}
					iconClassName="bg-marigold/15 text-marigold"
					marginalia="03"
					title="Carta de presentación IA."
				/>
				<BentoCellLinkedIn />
				<BentoCellNetwork />
				<BentoCellCoaching />
			</div>
		</section>
	);
}

function SectionLabel({ children, number }: { children: ReactNode; number: string }) {
	return (
		<div className="flex items-center gap-3">
			<span className="font-mono text-[11px] text-oxblood uppercase tabular-nums tracking-[0.22em]">§{number}</span>
			<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
			<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">{children}</span>
		</div>
	);
}

function BentoCellHero() {
	return (
		<div className="relative col-span-2 flex flex-col overflow-hidden rounded-2xl bg-foreground p-8 text-background md:col-span-4 md:row-span-2">
			<div className="flex items-center justify-between">
				<span className="font-mono text-[10px] text-marigold uppercase tracking-[0.22em]">★ Feature ancla · 01</span>
				<span className="font-mono text-[10px] text-background/40 uppercase tracking-[0.18em]">n = 2.4k</span>
			</div>

			<h3 className="mt-6 font-bold font-display text-[clamp(1.9rem,3vw,2.6rem)] text-background leading-[1.05] tracking-[-0.03em]">
				Score CV con IA: <br />
				de <span className="font-display-italic font-semibold text-marigold">43</span> a{" "}
				<span className="font-display-italic font-semibold text-marigold">84</span> en una semana.
			</h3>
			<p className="mt-4 max-w-[520px] text-background/70 text-sm leading-relaxed">
				Subís tu CV, registrás el rol y la IA te devuelve un puntaje 0–100 + lista de qué arreglar. Estructura, logros
				vs. tareas, keywords del sector, ATS. En Pro: comparación vs. oferta laboral específica + arreglo automático.
			</p>

			<div className="mt-auto pt-8">
				<div className="mb-3 flex h-28 items-end gap-1.5">
					{HERO_CHART.map((bar) => (
						<div
							className={cn(
								"flex-1 rounded-t-[2px] transition-[height]",
								bar.high ? "bg-oxblood shadow-[0_0_24px_oklch(0.61_0.13_162_/_0.5)]" : "bg-oxblood/25"
							)}
							key={`bar-${bar.heightPct}-${String(bar.high)}`}
							style={{ height: `${bar.heightPct}%` }}
						/>
					))}
				</div>
				<div className="flex items-center justify-between border-background/15 border-t pt-3 font-mono text-[10px] text-background/50 uppercase tracking-[0.16em]">
					<span>Día 1</span>
					<span className="hidden sm:inline">Score CV antes / después rewrite</span>
					<span>Día 7</span>
				</div>
			</div>
		</div>
	);
}

function BentoCellLinkedIn() {
	return (
		<div className="group relative col-span-2 flex flex-col rounded-2xl border border-foreground/10 bg-card p-7 transition hover:-translate-y-0.5 hover:border-oxblood/30 hover:shadow-[0_24px_48px_-16px_oklch(0.22_0.03_175_/_0.2)] md:col-span-3">
			<span className="absolute top-4 right-4 font-mono text-[10px] text-foreground/40 uppercase tracking-[0.16em]">
				04
			</span>
			<span className="mb-4 grid size-10 place-items-center rounded-lg bg-oxblood/12 text-oxblood transition-transform group-hover:rotate-[-4deg]">
				<LinkedinLogoIcon size={20} weight="duotone" />
			</span>
			<h3 className="font-bold font-display text-[1.4rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				Optimizador de LinkedIn.
			</h3>
			<p className="mt-2 text-foreground/65 text-sm leading-relaxed">
				Headline, About, bullets de cada experiencia. Score de perfil + mejoras concretas. El{" "}
				<span className="font-semibold text-foreground">CV digital</span> de LATAM — donde realmente te buscan.
			</p>

			<div className="mt-auto pt-6">
				<div className="rounded-lg border border-foreground/10 bg-background/60 p-3">
					<div className="flex items-center justify-between text-xs">
						<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">Perfil score</span>
						<span className="font-bold font-display text-foreground tabular-nums">
							62 → <span className="text-oxblood">91</span>
						</span>
					</div>
					<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/8">
						<div className="h-full w-[91%] rounded-full bg-gradient-to-r from-oxblood to-marigold" />
					</div>
				</div>
			</div>
		</div>
	);
}

function BentoCellNetwork() {
	return (
		<div className="group relative col-span-2 flex flex-col rounded-2xl border border-foreground/10 bg-card p-7 transition hover:-translate-y-0.5 hover:border-oxblood/30 hover:shadow-[0_24px_48px_-16px_oklch(0.22_0.03_175_/_0.2)] md:col-span-3">
			<span className="absolute top-4 right-4 font-mono text-[10px] text-foreground/40 uppercase tracking-[0.16em]">
				05
			</span>
			<span className="mb-4 grid size-10 place-items-center rounded-lg bg-marigold/15 text-marigold transition-transform group-hover:rotate-[-4deg]">
				<ChatTeardropDotsIcon size={20} weight="duotone" />
			</span>
			<h3 className="font-bold font-display text-[1.4rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				NetworkAI · Outreach.
			</h3>
			<p className="mt-2 text-foreground/65 text-sm leading-relaxed">
				Mensajes para contactar reclutadores en LinkedIn que no parecen plantilla. 1/mes en Free, ilimitados en Pro. Lo
				que más nos pide LATAM.
			</p>

			<div className="mt-auto pt-6">
				<div className="rounded-lg border border-foreground/10 bg-background/60 p-3 font-serif text-[12px] text-foreground/85 italic leading-snug">
					"Hola Camila, vi que lideraste el squad de growth en Yape. Aplico al rol de PM Jr. y me interesa entender..."{" "}
					<span className="text-foreground/45">[generado · editable]</span>
				</div>
			</div>
		</div>
	);
}

function BentoCellCoaching() {
	const coachStyles = [
		"from-emerald-300 to-emerald-600",
		"from-indigo-200 to-indigo-600",
		"from-emerald-200 to-emerald-500",
	];

	return (
		<div className="relative col-span-2 flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-marigold/12 via-card to-card p-7 md:col-span-6">
			<div className="grid items-end gap-6 md:grid-cols-12">
				<div className="md:col-span-7">
					<span className="font-mono text-[10px] text-marigold uppercase tracking-[0.22em]">★ Diferenciador · 06</span>
					<h3 className="mt-3 font-bold font-display text-[clamp(1.6rem,2.6vw,2.2rem)] text-foreground leading-[1.05] tracking-[-0.025em]">
						Coaching <span className="font-display-italic font-semibold text-oxblood">1:1 humano</span>. No lo pagás
						aparte.
					</h3>
					<p className="mt-3 max-w-[560px] text-foreground/70 text-sm leading-relaxed sm:text-[15px]">
						3–5 coaches senior peruanos en planilla — no freelancers. Wonsulting cobra entre $699 y $2.299 USD por algo
						parecido. Acá viene en Pro (1 sesión/mes) o Premium (3 sesiones + WhatsApp con coach).
					</p>
				</div>

				<div className="md:col-span-4 md:col-start-9">
					<div className="rounded-xl border border-foreground/10 bg-background/70 p-4">
						<div className="flex items-center gap-3">
							<div className="flex">
								{coachStyles.map((style, idx) => (
									<span
										aria-hidden="true"
										className={`block size-9 rounded-full border-2 border-card bg-gradient-to-br ${style} ${idx === 0 ? "" : "-ml-2"}`}
										key={style}
									/>
								))}
							</div>
							<div className="flex flex-col">
								<span className="font-bold font-display text-foreground text-sm leading-none">El staff</span>
								<span className="mt-1 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">
									Coaches peruanos senior
								</span>
							</div>
						</div>

						<div className="mt-4 flex items-center justify-between border-foreground/10 border-t pt-3">
							<span className="flex items-center gap-1.5 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">
								<HandshakeIcon size={12} weight="bold" />
								Wonsulting
							</span>
							<span className="font-bold font-display text-foreground/40 text-sm line-through">$699+</span>
						</div>
						<div className="mt-1.5 flex items-center justify-between">
							<span className="flex items-center gap-1.5 font-mono text-[10px] text-oxblood uppercase tracking-[0.14em]">
								<SparkleIcon size={12} weight="fill" />
								IMPULSA Pro
							</span>
							<span className="font-bold font-display text-oxblood text-sm">S/79</span>
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
	marginalia,
}: {
	icon: ReactNode;
	title: string;
	body: string;
	className?: string;
	iconClassName?: string;
	marginalia?: string;
}) {
	return (
		<div
			className={cn(
				"group relative flex flex-col rounded-2xl border border-foreground/10 bg-card p-7 transition hover:-translate-y-0.5 hover:border-oxblood/30 hover:shadow-[0_24px_48px_-16px_oklch(0.22_0.03_175_/_0.2)]",
				className
			)}
		>
			{marginalia && (
				<span className="absolute top-4 right-4 font-mono text-[10px] text-foreground/40 uppercase tracking-[0.16em]">
					{marginalia}
				</span>
			)}
			<span
				className={cn(
					"mb-4 grid size-10 place-items-center rounded-lg bg-oxblood/12 text-oxblood transition-transform group-hover:rotate-[-4deg]",
					iconClassName
				)}
			>
				{icon}
			</span>
			<h3 className="mb-2 font-bold font-display text-[1.25rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				{title}
			</h3>
			<p className="text-foreground/65 text-sm leading-relaxed">{body}</p>
		</div>
	);
}

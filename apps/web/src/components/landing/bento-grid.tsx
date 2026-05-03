import { HeartIcon, LightningIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HERO_CHART } from "./data";

export function BentoGrid() {
	return (
		<section className="px-6 py-32" id="mentorias">
			<div className="mx-auto mb-16 grid max-w-[1200px] gap-6 md:grid-cols-12">
				<div className="md:col-span-5">
					<div className="flex items-center gap-3">
						<span className="font-display-italic text-2xl text-oxblood leading-none">§02</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
							Por qué STACKCV
						</span>
					</div>
					<h2 className="mt-5 font-display font-medium text-[clamp(2.2rem,4.4vw,3.6rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
						No vendemos cursos. <span className="font-display-italic font-light text-oxblood">Trabajamos</span> tu caso.
					</h2>
				</div>
				<div className="flex items-end md:col-span-6 md:col-start-7">
					<p className="text-balance font-serif text-[1.4rem] text-foreground/80 leading-[1.4]">
						Mentoría 1:1 con personas que viven{" "}
						<span className="font-medium font-sans text-foreground not-italic">hacer hiring</span> todos los días. Lo
						que hacemos cabe en seis cajas.
					</p>
				</div>
			</div>

			<div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-3 [grid-auto-rows:minmax(200px,auto)] md:grid-cols-6">
				<BentoCellHero />
				<BentoCellRewrite />
				<BentoCellMentors />
				<BentoCellMetric />
				<BentoCellPlain
					body="Tu primera sesión en 48 hs. Slot de 60 min, video, mentor humano."
					className="col-span-2 md:col-span-3"
					icon={<LightningIcon size={18} weight="fill" />}
					iconClassName="bg-marigold/20 text-marigold"
					marginalia="05"
					title="Rapidez."
				/>
				<BentoCellPlain
					body="Diagnóstico inicial gratis. Cancelás cuando quieras. Sin tarjeta."
					className="col-span-2 md:col-span-3"
					icon={<HeartIcon size={18} weight="fill" />}
					iconClassName="bg-oxblood/12 text-oxblood"
					marginalia="06"
					title="Sin garrón."
				/>
			</div>
		</section>
	);
}

function BentoCellHero() {
	return (
		<div className="relative col-span-2 flex flex-col overflow-hidden rounded-sm bg-foreground p-8 text-background md:col-span-4 md:row-span-2">
			<div className="flex items-center justify-between">
				<span className="font-mono text-[10px] text-background/55 uppercase tracking-[0.22em]">
					Caso de estudio Nº 01
				</span>
				<span className="font-mono text-[10px] text-background/40 uppercase tracking-[0.18em]">n = 2.4k</span>
			</div>

			<h3 className="mt-6 font-display text-[clamp(1.9rem,3vw,2.7rem)] text-background leading-[1.02] tracking-[-0.03em]">
				De <span className="font-display-italic font-light text-marigold">cero</span> entrevistas a{" "}
				<span className="font-display-italic font-light text-marigold">tres</span> ofertas en 60 días.
			</h3>
			<p className="mt-4 max-w-[520px] text-background/65 text-sm leading-relaxed">
				<span className="numeral font-semibold text-background">73%</span> de nuestros mentees consigue su primera
				entrevista antes del primer mes después del rewrite.
			</p>

			<div className="mt-auto pt-8">
				<div className="mb-3 flex h-28 items-end gap-1.5">
					{HERO_CHART.map((bar) => (
						<div
							className={cn(
								"flex-1 rounded-t-[2px] transition-[height]",
								bar.high ? "bg-marigold shadow-[0_0_24px_oklch(0.78_0.16_65_/_0.5)]" : "bg-marigold/25"
							)}
							key={`bar-${bar.heightPct}-${String(bar.high)}`}
							style={{ height: `${bar.heightPct}%` }}
						/>
					))}
				</div>
				<div className="flex items-center justify-between border-background/15 border-t pt-3 font-mono text-[10px] text-background/50 uppercase tracking-[0.16em]">
					<span>Sem 1</span>
					<span className="hidden sm:inline">Mentees con 1ra entrevista (%)</span>
					<span>Sem 8</span>
				</div>
			</div>
		</div>
	);
}

function BentoCellRewrite() {
	return (
		<div className="group relative col-span-2 flex flex-col rounded-sm border border-foreground/10 bg-card p-7 transition hover:-translate-y-0.5 hover:border-oxblood/30 hover:shadow-[0_24px_48px_-16px_oklch(0.18_0.02_40_/_0.25)] md:row-span-2">
			<span className="absolute top-4 right-4 font-mono text-[10px] text-foreground/40 uppercase tracking-[0.16em]">
				Lección 02
			</span>
			<span className="mb-4 grid size-10 place-items-center rounded-sm bg-oxblood/10 text-oxblood transition-transform group-hover:rotate-[-4deg]">
				<PencilSimpleIcon size={18} weight="bold" />
			</span>
			<h3 className="mb-3 font-display font-medium text-[1.4rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				Rewrite real, no plantillas.
			</h3>
			<p className="text-foreground/65 text-sm leading-relaxed">
				Reescribimos cada bullet con vos: métrica, verbo de acción, contexto. Bullets que se leen y se recuerdan.
			</p>

			<div className="mt-auto space-y-2 pt-6">
				<RewriteExample
					original="Trabajé en un proyecto de ONG."
					revised="Coordiné 6 voluntarios en una campaña que recolectó $340K MXN en 8 semanas."
				/>
			</div>
		</div>
	);
}

function RewriteExample({ original, revised }: { original: string; revised: string }) {
	return (
		<div className="rounded-sm border border-foreground/10 bg-background/60 p-3 text-xs leading-snug">
			<p className="text-foreground/45 line-through">{original}</p>
			<div className="my-1.5 flex items-center gap-1.5 font-mono text-[9px] text-oxblood uppercase tracking-[0.16em]">
				<span className="h-px flex-1 bg-oxblood/25" />
				rewrite
				<span className="h-px flex-1 bg-oxblood/25" />
			</div>
			<p className="font-medium text-foreground">{revised}</p>
		</div>
	);
}

function BentoCellMentors() {
	const mentorStyles = [
		"from-amber-300 to-orange-600",
		"from-rose-200 to-rose-500",
		"from-emerald-200 to-emerald-500",
		"from-stone-200 to-stone-600",
		"from-orange-200 to-red-500",
	];

	return (
		<div className="col-span-2 flex flex-col rounded-sm border border-foreground/10 bg-card p-7 md:col-span-3">
			<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.22em]">§ El staff editorial</span>
			<h3 className="mt-2 font-display font-medium text-[1.4rem] text-foreground tracking-[-0.02em]">
				<span className="numeral text-oxblood">12</span> mentores. Recruiters de MELI, Rappi y Globant.
			</h3>
			<p className="mt-2 max-w-[380px] text-foreground/65 text-sm leading-relaxed">
				Cada uno con 5+ años haciendo hiring para tech, producto y consultoría. Te asignamos al que más se acerca a tu
				caso.
			</p>

			<div className="mt-auto flex items-center justify-between pt-6">
				<div className="flex">
					{mentorStyles.map((style, idx) => (
						<span
							aria-hidden="true"
							className={`block size-9 rounded-full border-2 border-card bg-gradient-to-br ${style} ${idx === 0 ? "" : "-ml-2.5"}`}
							key={style}
						/>
					))}
					<span className="-ml-2.5 grid size-9 place-items-center rounded-full border-2 border-card bg-foreground font-display font-semibold text-[11px] text-background">
						+7
					</span>
				</div>
				<span className="font-mono text-[10px] text-foreground/45 uppercase tracking-[0.16em]">03</span>
			</div>
		</div>
	);
}

function BentoCellMetric() {
	return (
		<div className="relative col-span-2 flex flex-col overflow-hidden rounded-sm border border-foreground/10 bg-card p-7 md:col-span-3">
			<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.22em]">§ Encuesta NPS '25</span>
			<p className="numeral my-3 font-display font-medium text-[5.5rem] text-foreground leading-[0.85] tracking-[-0.06em]">
				94<span className="font-display-italic font-light text-oxblood">%</span>
			</p>
			<p className="max-w-[280px] text-foreground/65 text-sm leading-snug">
				recomendarían stackcv a un amigo. Encuesta independiente, n = 380.
			</p>

			<svg
				aria-hidden="true"
				className="absolute -right-4 -bottom-4 size-28 text-oxblood/12"
				fill="currentColor"
				viewBox="0 0 100 100"
			>
				<title>seal</title>
				<path d="M50 5 L 60 22 L 78 18 L 76 36 L 92 44 L 80 58 L 90 74 L 72 76 L 70 94 L 54 84 L 36 92 L 32 74 L 14 70 L 22 54 L 8 42 L 24 32 L 22 14 L 40 18 Z" />
			</svg>

			<span className="absolute top-4 right-4 font-mono text-[10px] text-foreground/40 uppercase tracking-[0.16em]">
				04
			</span>
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
				"group relative flex flex-col rounded-sm border border-foreground/10 bg-card p-7 transition hover:-translate-y-0.5 hover:border-oxblood/30 hover:shadow-[0_24px_48px_-16px_oklch(0.18_0.02_40_/_0.25)]",
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
					"mb-4 grid size-10 place-items-center rounded-sm bg-oxblood/10 text-oxblood transition-transform group-hover:rotate-[-4deg]",
					iconClassName
				)}
			>
				{icon}
			</span>
			<h3 className="mb-2 font-display font-medium text-[1.25rem] text-foreground leading-[1.15] tracking-[-0.02em]">
				{title}
			</h3>
			<p className="text-foreground/65 text-sm leading-relaxed">{body}</p>
		</div>
	);
}

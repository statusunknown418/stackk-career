import { ArrowRightIcon } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { WHY_REASONS } from "./data";

export function WhyImpulsa() {
	return (
		<section className="px-6 py-32" id="por-que">
			<div className="mx-auto max-w-[1200px]">
				<Reveal>
					<header className="mb-20 max-w-[820px]">
						<span className="font-mono text-[11px] text-foreground/55 uppercase tracking-[0.18em]">
							— Por qué IMPULSA
						</span>
						<h2 className="mt-4 font-bold font-display text-[clamp(2.4rem,5.6vw,4.5rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
							<WordReveal>Lo que LATAM no tenía.</WordReveal>
						</h2>
					</header>
				</Reveal>

				<div className="grid gap-x-6 gap-y-8 md:grid-cols-2">
					{WHY_REASONS.map((reason, idx) => (
						<Reveal delay={(idx % 2) * 0.08} key={reason.number}>
							<article className="group relative flex h-full flex-col gap-6 rounded-sm border border-foreground/8 bg-card/40 p-7 transition-all duration-300 hover:border-foreground/18 hover:bg-card/70">
								<header className="flex items-baseline justify-between">
									<span className="font-mono text-[10px] text-foreground/45 uppercase tracking-[0.18em]">
										— Razón {reason.number}
									</span>
									<span className="font-display-italic font-light text-3xl text-foreground/15 leading-none">
										{reason.number}
									</span>
								</header>

								<div className="grid h-[140px] place-items-stretch overflow-hidden rounded-sm border border-foreground/8 bg-foreground/[0.015] p-5">
									<ReasonVisual id={reason.number} />
								</div>

								<div className="flex-1">
									<h3 className="font-display font-semibold text-[clamp(1.35rem,2.1vw,1.75rem)] text-foreground leading-[1.15] tracking-[-0.025em]">
										{reason.title}{" "}
										<span className="font-display-italic font-light text-oxblood">{reason.emphasis}</span>
									</h3>
									<p className="mt-3 max-w-[44ch] text-[14.5px] text-foreground/65 leading-[1.6]">{reason.body}</p>
								</div>

								<footer className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-foreground/8 border-t pt-4">
									<p className="font-mono text-[10px] text-foreground/45 uppercase tracking-[0.14em]">
										{reason.receipt.label}
									</p>
									<p className="font-display font-medium text-foreground text-sm tracking-tight">
										{reason.receipt.value}
									</p>
								</footer>
							</article>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}

function ReasonVisual({ id }: { id: string }) {
	if (id === "01") {
		return <PriceComparisonViz />;
	}
	if (id === "02") {
		return <ToolsMergeViz />;
	}
	if (id === "03") {
		return <LatamGridViz />;
	}
	return <VelocityViz />;
}

function PriceComparisonViz() {
	return (
		<div className="flex flex-col justify-center gap-3.5">
			<VizRow
				barClass="w-full bg-foreground/15"
				label="Otros servicios"
				value="US$699+"
				valueClass="text-foreground/55"
			/>
			<VizRow
				barClass="w-[14%] bg-gradient-to-r from-oxblood to-aurora-3 shadow-[0_0_18px_-2px_oklch(from_var(--oxblood)_l_c_h/0.45)]"
				label="IMPULSA Pro"
				value="S/79"
				valueClass="text-oxblood"
			/>
		</div>
	);
}

function VizRow({
	barClass,
	label,
	value,
	valueClass,
}: {
	barClass: string;
	label: string;
	value: string;
	valueClass: string;
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="w-[88px] shrink-0 font-mono text-[10px] text-foreground/45 uppercase tracking-[0.12em]">
				{label}
			</span>
			<span className="relative h-5 flex-1 overflow-hidden rounded-sm bg-foreground/5">
				<span className={`absolute inset-y-0 left-0 rounded-sm ${barClass}`} />
			</span>
			<span className={`w-14 shrink-0 text-right font-display font-medium text-xs ${valueClass}`}>{value}</span>
		</div>
	);
}

function ToolsMergeViz() {
	const tools = ["CV con IA", "Cartas IA", "LinkedIn", "Outreach", "+ Score"];
	return (
		<div className="flex flex-col justify-center gap-3">
			<div className="flex flex-wrap gap-1">
				{tools.map((t) => (
					<span
						className="rounded-sm border border-foreground/12 px-2 py-1 font-mono text-[9px] text-foreground/50 uppercase tracking-[0.1em] line-through decoration-foreground/20"
						key={t}
					>
						{t}
					</span>
				))}
			</div>
			<div className="flex items-center gap-2">
				<ArrowRightIcon className="text-oxblood" size={14} weight="bold" />
				<span className="rounded-sm border border-oxblood/25 bg-oxblood/8 px-2.5 py-1 font-display font-medium text-[11px] text-oxblood">
					IMPULSA Pro — 1 plan
				</span>
			</div>
		</div>
	);
}

const LATAM_COUNTRY_CODES = ["MX", "CO", "EC", "PE", "CL", "AR", "UY", "ES"];

function LatamGridViz() {
	return (
		<div className="flex h-full flex-col justify-center gap-2.5">
			<div className="grid grid-cols-4 gap-1.5">
				{LATAM_COUNTRY_CODES.map((code, i) => (
					<div
						className="group/c relative flex items-center justify-center gap-1.5 rounded-sm border border-foreground/10 bg-card py-2 transition-colors hover:border-oxblood/40"
						key={code}
					>
						<span
							aria-hidden="true"
							className="size-1.5 rounded-full bg-oxblood/80 motion-safe:animate-[live-pulse_2.4s_ease-in-out_infinite]"
							style={{ animationDelay: `${i * 0.2}s` }}
						/>
						<span className="font-mono font-semibold text-[11px] text-foreground/80 tracking-[0.06em]">{code}</span>
					</div>
				))}
			</div>
			<p className="text-center font-mono text-[9px] text-foreground/45 uppercase tracking-[0.18em]">
				8 países · 100% español
			</p>
		</div>
	);
}

type VelocityStyle = "muted" | "active" | "result";

interface VelocityMarker {
	day: string;
	label: string;
	pct: number;
	style: VelocityStyle;
}

const VELOCITY_MARKERS: readonly VelocityMarker[] = [
	{ day: "Día 0", label: "Subes CV", pct: 0, style: "muted" },
	{ day: "Día 2", label: "Score + rewrite", pct: 6, style: "active" },
	{ day: "Día 14", label: "1ª entrevista", pct: 39, style: "active" },
	{ day: "Día 36", label: "Oferta firmada", pct: 100, style: "result" },
];

const VELOCITY_DOT_STYLE: Record<VelocityStyle, string> = {
	active: "bg-oxblood",
	muted: "border border-foreground/30 bg-card",
	result: "bg-marigold shadow-[0_0_10px_-1px_oklch(from_var(--marigold)_l_c_h/0.6)]",
};

function getVelocityLabelAlign(i: number, total: number): string {
	if (i === 0) {
		return "text-left";
	}
	if (i === total - 1) {
		return "text-right font-medium text-marigold";
	}
	return "text-center";
}

function VelocityViz() {
	return (
		<div className="flex flex-col justify-center gap-3">
			<div className="relative h-px bg-foreground/12">
				<div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-foreground/15 via-oxblood/35 to-marigold/55" />
				{VELOCITY_MARKERS.map((m) => (
					<span
						className={`absolute top-1/2 grid size-2.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${VELOCITY_DOT_STYLE[m.style]}`}
						key={m.day}
						style={{ left: `${m.pct}%` }}
					/>
				))}
			</div>
			<div className="flex justify-between font-mono text-[9px] text-foreground/50 uppercase tracking-[0.1em]">
				{VELOCITY_MARKERS.map((m) => (
					<span
						className="flex-1 first:text-left last:text-right [&:not(:first-child):not(:last-child)]:text-center"
						key={m.day}
					>
						{m.day}
					</span>
				))}
			</div>
			<div className="flex justify-between gap-1 font-display text-[11px] text-foreground/75 leading-tight">
				{VELOCITY_MARKERS.map((m, i) => (
					<span className={`flex-1 ${getVelocityLabelAlign(i, VELOCITY_MARKERS.length)}`} key={m.day}>
						{m.label}
					</span>
				))}
			</div>
		</div>
	);
}

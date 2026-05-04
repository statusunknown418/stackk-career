import { ArrowRightIcon, StarIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GradientBars } from "../gradient-bars";
import { LogoCarousel } from "../ui/logo-carousel";
import { TRUST_LOGOS } from "./data";
import { HeroVisual } from "./hero-visual";

const AVATAR_GRADIENTS = [
	"from-emerald-300 to-emerald-600",
	"from-indigo-300 to-indigo-600",
	"from-emerald-200 to-emerald-500",
	"from-indigo-200 to-indigo-500",
];

export function Hero() {
	return (
		<section className="paper-grain relative overflow-hidden px-6 pt-16 pb-20" id="top">
			<HeroBackground className="hidden" />
			<GradientBars />

			<div className="relative z-10 mx-auto max-w-[1200px]">
				<TopBar />

				<div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
					<div className="lg:col-span-7">
						<a
							className="group mb-9 inline-flex items-center gap-2.5 rounded-full border border-foreground/10 bg-background/70 py-1 pr-3.5 pl-1 font-medium text-foreground/70 text-xs backdrop-blur-md transition hover:border-oxblood/40 hover:text-foreground"
							href="#features"
						>
							<span className="rounded-full bg-oxblood px-2.5 py-0.5 font-bold text-[10px] text-white uppercase tracking-[0.14em]">
								Nuevo
							</span>
							<span className="text-[13px] text-foreground">
								Score CV gratis con IA — descubrí cómo te ven los recruiters
							</span>
							<ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" weight="bold" />
						</a>

						<h1 className="font-bold font-display text-[clamp(2.6rem,6.4vw,5.2rem)] text-foreground leading-[1] tracking-[-0.035em]">
							<span className="block animate-rise-1">Tu carrera,</span>
							<span className="block animate-rise-2">
								sin{" "}
								<span className="relative inline-block">
									<span className="font-display-italic font-semibold text-oxblood">techo de cristal</span>
									<HandDrawnUnderline />
								</span>
								.
							</span>
						</h1>

						<p className="mt-7 max-w-[560px] animate-rise-3 text-balance text-[clamp(1.05rem,1.4vw,1.18rem)] text-foreground/70 leading-[1.55]">
							Plataforma de empleo con <span className="font-semibold text-foreground">IA + coaching humano</span> para
							LATAM. Subí tu CV, vé tu score 0–100, hablá con un coach senior peruano. Pagás solo si querés más.
						</p>

						<div className="mt-9 flex animate-rise-4 flex-wrap items-center gap-3">
							<a className={buttonVariants({ size: "lg" })} href="#planes">
								<UploadSimpleIcon weight="bold" />
								Subí tu CV gratis
							</a>
							<a
								className="inline-flex h-10 items-center gap-2 px-2 font-medium text-foreground text-sm underline decoration-2 decoration-oxblood/50 underline-offset-[6px] transition hover:decoration-oxblood"
								href="#planes"
							>
								Ver planes desde S/79
							</a>
						</div>

						<HeroStats />
					</div>

					<aside className="hidden lg:col-span-5 lg:block">
						<ScoreCard />
					</aside>
				</div>

				<div className="mt-24">
					<HeroVisual />
				</div>

				<section className="mt-24 grid place-items-center">
					<LogoCarousel />
				</section>

				<TrustStrip />
			</div>
		</section>
	);
}

function TopBar() {
	return (
		<div className="flex items-center justify-between border-foreground/15 border-t pt-3 font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
			<span className="flex items-center gap-2">
				<span className="size-1.5 rounded-full bg-oxblood" />
				IMPULSA · Plataforma de empleo IA + Coach
			</span>
			<span className="hidden md:inline">Hecho en Perú · Para todo LATAM</span>
			<span>v.1.0</span>
		</div>
	);
}

function HandDrawnUnderline() {
	return (
		<svg
			aria-hidden="true"
			className="absolute bottom-[-0.18em] left-1/2 w-[108%] -translate-x-1/2"
			fill="none"
			preserveAspectRatio="none"
			viewBox="0 0 320 24"
		>
			<title>underline</title>
			<path
				className="animate-underline-draw"
				d="M4 14 Q 80 4, 162 12 T 316 10"
				stroke="var(--oxblood)"
				strokeDasharray="320"
				strokeDashoffset="320"
				strokeLinecap="round"
				strokeWidth="3"
			/>
		</svg>
	);
}

function ScoreCard() {
	return (
		<div className="relative ml-auto max-w-[400px]">
			<div className="absolute -top-3 -right-3 hidden size-20 rounded-full border-2 border-oxblood/30 border-dashed lg:block" />

			<div className="relative rounded-2xl border border-foreground/10 bg-card p-7 shadow-[var(--shadow-card-soft)]">
				<div className="flex items-center justify-between">
					<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.18em]">Tu score CV</span>
					<span className="rounded-full bg-oxblood/12 px-2 py-0.5 font-mono text-[9px] text-oxblood uppercase tracking-[0.16em]">
						En vivo
					</span>
				</div>

				<div className="mt-4 flex items-baseline gap-3">
					<span className="font-display font-extrabold text-[5rem] text-foreground tabular-nums leading-none tracking-[-0.045em]">
						43
					</span>
					<span className="font-display text-2xl text-foreground/40 tracking-[-0.02em]">/ 100</span>
				</div>

				<div className="mt-3 flex items-center gap-2 text-oxblood text-sm">
					<ArrowRightIcon weight="bold" />
					<span className="font-semibold">Subiendo a 84 con el rewrite IA</span>
				</div>

				<div className="mt-5 h-2 overflow-hidden rounded-full bg-foreground/8">
					<div
						className="h-full rounded-full bg-gradient-to-r from-oxblood via-oxblood to-marigold"
						style={{ width: "84%" }}
					/>
				</div>

				<ul className="mt-6 flex flex-col gap-2.5 border-foreground/10 border-t pt-5">
					<ScoreItem label="Estructura ATS-friendly" status="ok" />
					<ScoreItem label="Logros vs. tareas" status="warn" />
					<ScoreItem label="Keywords del rol" status="warn" />
					<ScoreItem label="LinkedIn alineado" status="bad" />
				</ul>

				<div className="mt-6 border-foreground/10 border-t pt-4 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.16em]">
					— score 100% gratis · 1/mes —
				</div>
			</div>
		</div>
	);
}

function ScoreItem({ label, status }: { label: string; status: "ok" | "warn" | "bad" }) {
	const colorMap = {
		ok: "bg-oxblood",
		warn: "bg-marigold",
		bad: "bg-foreground/30",
	};
	const labelMap = {
		ok: "OK",
		warn: "MEJORAR",
		bad: "FALTA",
	};
	return (
		<li className="flex items-center justify-between text-sm">
			<span className="flex items-center gap-2.5 text-foreground/85">
				<span aria-hidden="true" className={`size-1.5 rounded-full ${colorMap[status]}`} />
				{label}
			</span>
			<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.16em]">{labelMap[status]}</span>
		</li>
	);
}

function HeroStats() {
	return (
		<dl className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-foreground/10 border-t pt-7 text-foreground/65 text-sm">
			<div className="flex items-center gap-3">
				<div className="flex">
					{AVATAR_GRADIENTS.map((gradient, idx) => (
						<span
							aria-hidden="true"
							className={`block size-7 rounded-full border-2 border-background bg-gradient-to-br ${gradient} ${idx === 0 ? "" : "-ml-2"}`}
							key={gradient}
						/>
					))}
				</div>
				<span>
					<strong className="font-bold font-display text-foreground tabular-nums">2.400+</strong> CVs scoreados
				</span>
			</div>

			<span aria-hidden="true" className="size-1 rounded-full bg-current opacity-30" />

			<div className="flex items-center gap-2">
				<span className="flex text-marigold">
					{[0, 1, 2, 3, 4].map((i) => (
						<StarIcon key={i} size={14} weight="fill" />
					))}
				</span>
				<span>
					<strong className="font-bold font-display text-foreground tabular-nums">4.9</strong> en 380 reseñas
				</span>
			</div>

			<span aria-hidden="true" className="size-1 rounded-full bg-current opacity-30" />

			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
				LATAM · Español neutro
			</div>
		</dl>
	);
}

function HeroBackground({ className }: { className?: string }) {
	return (
		<div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
			<div className="absolute -top-[20vw] -left-[10vw] size-[55vw] animate-aurora-1 rounded-full bg-oxblood opacity-20 blur-[140px]" />
			<div className="absolute top-[5vw] -right-[20vw] size-[55vw] animate-aurora-2 rounded-full bg-marigold opacity-15 blur-[140px]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,transparent_0%,var(--background)_75%)]" />
			<NoiseOverlay />
		</div>
	);
}

function NoiseOverlay() {
	return (
		<svg
			aria-hidden="true"
			className="absolute inset-0 size-full opacity-[0.04] mix-blend-multiply dark:mix-blend-overlay"
		>
			<title>noise</title>
			<filter id="landing-noise">
				<feTurbulence baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" type="fractalNoise" />
				<feColorMatrix type="saturate" values="0" />
			</filter>
			<rect filter="url(#landing-noise)" height="100%" width="100%" />
		</svg>
	);
}

function TrustStrip() {
	return (
		<div className="mt-24">
			<div className="flex items-baseline justify-between border-foreground/15 border-t pt-4">
				<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
					— Mentees ahora trabajan en —
				</span>
				<span className="hidden font-mono text-[10px] text-foreground/45 uppercase tracking-[0.22em] sm:inline">
					Cohorts 2024 · 2025 · 2026
				</span>
			</div>

			<div className="mt-6 overflow-hidden">
				<div className="flex w-max animate-marquee items-center gap-x-14 text-foreground/55 will-change-transform">
					{TRUST_LOGOS.map((logo) => (
						<LogoMark key={`a-${logo.name}`} {...logo} />
					))}
					{TRUST_LOGOS.map((logo) => (
						<LogoMark key={`b-${logo.name}`} {...logo} />
					))}
				</div>
			</div>
		</div>
	);
}

function LogoMark({ name, style }: { name: string; style: "bold" | "regular" | "mono" }) {
	if (style === "bold") {
		return <span className="shrink-0 font-bold font-display text-2xl tracking-tight">{name}</span>;
	}
	if (style === "mono") {
		return <span className="shrink-0 font-mono text-base uppercase tracking-[0.12em]">{name}</span>;
	}
	return <span className="shrink-0 font-display-italic text-2xl">{name}</span>;
}

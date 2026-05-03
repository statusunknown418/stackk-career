import { ArrowRightIcon, StarIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { HeroVisual } from "./hero-visual";

const AVATAR_GRADIENTS = [
	"from-amber-200 to-orange-500",
	"from-rose-200 to-rose-600",
	"from-stone-200 to-stone-600",
	"from-orange-200 to-red-500",
];

const TRUST_LOGOS = [
	{ name: "MercadoLibre", style: "bold" as const },
	{ name: "Rappi", style: "bold" as const },
	{ name: "Globant", style: "regular" as const },
	{ name: "NotCo", style: "mono" as const },
	{ name: "Kavak", style: "regular" as const },
	{ name: "Nubank", style: "bold" as const },
	{ name: "Auth0", style: "regular" as const },
	{ name: "Bitso", style: "mono" as const },
];

export function Hero() {
	return (
		<section className="paper-grain relative overflow-hidden px-6 pt-16 pb-20" id="top">
			<EditorialBackground />

			<div className="relative z-10 mx-auto max-w-[1200px]">
				<EditorialBar />

				<div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
					<div className="lg:col-span-7">
						<a
							className="group mb-9 inline-flex items-center gap-2.5 rounded-full border border-foreground/10 bg-background/70 py-1 pr-3.5 pl-1 font-medium text-foreground/70 text-xs backdrop-blur-md transition hover:border-oxblood/40 hover:text-foreground"
							href="#recursos"
						>
							<span className="rounded-full bg-oxblood px-2.5 py-0.5 font-semibold text-[10px] text-paper uppercase tracking-[0.14em]">
								Nº 01 · 2026
							</span>
							<span className="font-serif text-[13px] text-foreground italic">
								Guía: el CV que pasa el ATS de Google
							</span>
							<ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" weight="bold" />
						</a>

						<h1 className="font-display text-[clamp(2.8rem,7.4vw,6.2rem)] text-foreground leading-[0.96] tracking-[-0.045em]">
							<span className="block animate-rise-1 font-medium">Tu primer CV</span>
							<span className="block animate-rise-2 font-medium">
								merece una{" "}
								<span className="relative inline-block">
									<span className="font-display-italic font-light text-oxblood">conversación</span>
									<HandDrawnUnderline />
								</span>
								,
							</span>
							<span className="block animate-rise-3 font-medium">no una plantilla.</span>
						</h1>

						<p className="mt-9 max-w-[560px] animate-rise-4 text-balance text-[clamp(1.05rem,1.4vw,1.2rem)] text-foreground/70 leading-[1.55]">
							Mentorías 1:1 con profesionales que ya pasaron por lo que estás viviendo. Revisamos tu CV, tu LinkedIn y
							tu estrategia — <span className="font-serif text-foreground italic">hasta que llegue la entrevista</span>{" "}
							que buscás.
						</p>

						<div className="mt-10 flex animate-rise-5 flex-wrap items-center gap-3">
							<a className={buttonVariants({ size: "lg" })} href="#planes">
								Empezar diagnóstico gratis
								<ArrowRightIcon weight="bold" />
							</a>
							<a
								className="inline-flex h-10 items-center gap-2 px-2 font-medium text-foreground text-sm underline decoration-2 decoration-oxblood/50 underline-offset-[6px] transition hover:decoration-oxblood"
								href="#planes"
							>
								Ver planes y precios
							</a>
						</div>

						<HeroStats />
					</div>

					<aside className="hidden lg:col-span-5 lg:block">
						<MarginNote />
					</aside>
				</div>

				<div className="mt-24">
					<HeroVisual />
				</div>

				<TrustStrip />
			</div>
		</section>
	);
}

function EditorialBar() {
	return (
		<div className="flex items-center justify-between border-foreground/15 border-t pt-3 font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
			<span className="flex items-center gap-2">
				<span className="size-1.5 rounded-full bg-oxblood" />
				Issue Nº 01 — Carrera & Oficio
			</span>
			<span className="hidden md:inline">LatAm + España · Spring/2026</span>
			<span>p. 01</span>
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
			<path
				className="animate-underline-draw [animation-delay:0.2s]"
				d="M14 19 Q 110 12, 200 18 T 308 16"
				opacity="0.55"
				stroke="var(--oxblood)"
				strokeDasharray="320"
				strokeDashoffset="320"
				strokeLinecap="round"
				strokeWidth="2"
			/>
		</svg>
	);
}

function MarginNote() {
	return (
		<figure className="relative mt-2 ml-auto max-w-[360px] -rotate-[1.2deg]">
			<div className="relative rounded-sm border border-foreground/10 bg-card/90 p-7 shadow-[0_2px_0_var(--rule),0_24px_60px_-24px_oklch(0.18_0.02_40_/_0.35)] backdrop-blur-sm">
				<span className="absolute top-3 right-3 font-mono text-[10px] text-foreground/45 uppercase tracking-[0.18em]">
					Marginalia
				</span>

				<svg
					aria-hidden="true"
					className="absolute top-2 left-2 h-12 w-16 text-oxblood/70"
					fill="none"
					preserveAspectRatio="none"
					viewBox="0 0 100 60"
				>
					<title>annotation circle</title>
					<path
						className="animate-circle-draw [animation-delay:0.7s]"
						d="M14 30 Q 14 6, 50 8 Q 86 10, 88 32 Q 90 54, 50 54 Q 10 54, 14 30 Z"
						stroke="currentColor"
						strokeDasharray="600"
						strokeDashoffset="600"
						strokeLinecap="round"
						strokeWidth="2"
					/>
				</svg>

				<p className="mt-6 font-display text-[1.4rem] leading-[1.15] tracking-[-0.025em]">
					<span className="font-display-italic text-oxblood">Lo que arreglamos</span> es la historia, no el formato.
				</p>

				<dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-foreground/10 border-t pt-4">
					<MiniStat label="Tasa de respuesta" value="3.4×" />
					<MiniStat label="Días al 1er sí" value="19" />
					<MiniStat label="Mentees activos" value="2.4k" />
					<MiniStat label="Garantía" value="90d" />
				</dl>

				<p className="mt-5 border-foreground/10 border-t pt-3 font-mono text-[10px] text-foreground/50 uppercase tracking-[0.16em]">
					— firmado, el equipo editor
				</p>
			</div>
		</figure>
	);
}

function MiniStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col">
			<dd className="numeral font-display font-medium text-[1.6rem] leading-none tracking-[-0.03em]">{value}</dd>
			<dt className="mt-1.5 font-mono text-[9px] text-foreground/55 uppercase tracking-[0.14em]">{label}</dt>
		</div>
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
					<strong className="numeral font-display font-semibold text-foreground">2,400+</strong> mentorías
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
					<strong className="numeral font-display font-semibold text-foreground">4.9</strong> en 380 reseñas
				</span>
			</div>

			<span aria-hidden="true" className="size-1 rounded-full bg-current opacity-30" />

			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
				LatAm + España
			</div>
		</dl>
	);
}

function EditorialBackground() {
	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
			<div className="absolute -top-[20vw] -left-[10vw] size-[55vw] animate-aurora-1 rounded-full bg-marigold opacity-25 blur-[140px]" />
			<div className="absolute top-[5vw] -right-[20vw] size-[55vw] animate-aurora-2 rounded-full bg-oxblood opacity-20 blur-[140px]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,transparent_0%,var(--background)_75%)]" />
			<NoiseOverlay />
		</div>
	);
}

function NoiseOverlay() {
	return (
		<svg
			aria-hidden="true"
			className="absolute inset-0 size-full opacity-[0.06] mix-blend-multiply dark:mix-blend-overlay"
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
		return <span className="shrink-0 font-bold text-2xl tracking-tight">{name}</span>;
	}
	if (style === "mono") {
		return <span className="shrink-0 font-mono text-base uppercase tracking-[0.12em]">{name}</span>;
	}
	return <span className="shrink-0 font-display-italic text-2xl">{name}</span>;
}

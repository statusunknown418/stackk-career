"use client";

import { type MotionValue, motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

interface StatLine {
	accent?: "oxblood" | "marigold";
	label: string;
	value: string;
}

const STAT_LINES: readonly StatLine[] = [
	{ value: "2,400+", label: "consiguieron entrevista el último año" },
	{ value: "4.9★", label: "en 380 reseñas verificadas" },
	{ value: "47 → 95", label: "es el salto promedio en el score CV", accent: "oxblood" },
	{ value: "S/79", label: "al mes tienes tu coach", accent: "marigold" },
];

const ACCENT_COLOR = {
	default: "text-foreground",
	marigold: "text-marigold",
	oxblood: "text-oxblood",
} as const satisfies Record<"default" | "oxblood" | "marigold", string>;

interface FloatingLogo {
	delay: number;
	left?: string;
	name: string;
	right?: string;
	rotate: number;
	style: string;
	top: string;
}

const FLOATING_LOGOS: readonly FloatingLogo[] = [
	{ name: "Mercado Libre", style: "font-medium tracking-tight", top: "8%", left: "8%", rotate: -6, delay: 0 },
	{ name: "Avianca", style: "font-semibold italic tracking-tight", top: "10%", left: "30%", rotate: -3, delay: 1 },
	{ name: "Konfío", style: "font-bold tracking-tight", top: "12%", right: "30%", rotate: 4, delay: 2 },
	{ name: "Falabella", style: "font-semibold tracking-tight", top: "14%", right: "7%", rotate: 5, delay: 3 },
	{ name: "Nubank", style: "font-bold italic tracking-tight", top: "44%", left: "4%", rotate: 7, delay: 1.5 },
	{ name: "BBVA", style: "font-bold tracking-tight", top: "50%", right: "4%", rotate: -3, delay: 4 },
	{ name: "Despegar", style: "font-bold tracking-tight", top: "76%", left: "7%", rotate: 3, delay: 2.5 },
	{ name: "Stori", style: "font-semibold tracking-tight", top: "82%", left: "28%", rotate: 4, delay: 3.5 },
	{ name: "Movistar", style: "font-medium tracking-tight", top: "82%", right: "28%", rotate: -2, delay: 5 },
	{ name: "Tiendanube", style: "font-medium tracking-tight", top: "78%", right: "8%", rotate: -4, delay: 5.4 },
];

export function StatsAccumulation() {
	const containerRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end end"],
	});

	return (
		<section className="relative" id="prueba" ref={containerRef} style={{ height: "130vh" }}>
			<div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
				<div
					aria-hidden="true"
					className="absolute top-1/2 left-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-oxblood/10 via-marigold/5 to-transparent blur-3xl"
				/>

				<FloatingLogos progress={scrollYProgress} />

				<div className="relative z-10 mx-auto w-full max-w-[900px] text-center">
					<motion.p
						animate={{ opacity: 1, y: 0 }}
						className="mb-6 font-mono text-[11px] text-foreground/70 uppercase tracking-[0.22em]"
						initial={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.5 }}
						viewport={{ once: false, margin: "-30% 0px" }}
						whileInView={{ opacity: 1, y: 0 }}
					>
						Datos de los últimos 12 meses
					</motion.p>

					<motion.h2
						animate={{ opacity: 1, y: 0 }}
						className="font-bold font-display text-[clamp(1.5rem,2.8vw,2.25rem)] text-foreground/85 leading-[1.2] tracking-[-0.025em]"
						initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
						transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
						viewport={{ once: false }}
						whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					>
						Tu próxima entrevista no es suerte.{" "}
						<span className="font-display-italic font-light text-oxblood">Es método.</span>
					</motion.h2>

					<div className="mt-12 flex flex-col items-center gap-y-1 md:gap-y-2">
						{STAT_LINES.map((line, i) => (
							<StatLineItem
								accent={line.accent}
								delay={0.15 + i * 0.12}
								key={line.value}
								label={line.label}
								value={line.value}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function StatLineItem({
	accent,
	delay,
	label,
	value,
}: {
	accent?: "oxblood" | "marigold";
	delay: number;
	label: string;
	value: string;
}) {
	const valueColor = ACCENT_COLOR[accent ?? "default"];

	return (
		<motion.p
			animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
			className="flex flex-wrap items-baseline justify-center gap-x-3 font-bold font-display text-[clamp(1.75rem,4.4vw,3.5rem)] leading-[1.1] tracking-[-0.035em]"
			initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
			transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
			viewport={{ once: false, margin: "-20% 0px" }}
			whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
		>
			<span className={`tabular-nums ${valueColor}`}>{value}</span>
			<span className="font-display-italic font-light text-foreground/65">{label}</span>
		</motion.p>
	);
}

const MAX_LOGO_DELAY = 5.4;
const PARALLAX_SPEED_MIN = 0.45;
const PARALLAX_SPEED_RANGE = 1.1;
const PARALLAX_ENTER_Y = 70;
const PARALLAX_EXIT_Y = -160;

function FloatingLogos({ progress }: { progress: MotionValue<number> }) {
	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0">
			{FLOATING_LOGOS.map((logo) => (
				<FloatingLogoChip key={logo.name} logo={logo} progress={progress} />
			))}
		</div>
	);
}

function FloatingLogoChip({ logo, progress }: { logo: FloatingLogo; progress: MotionValue<number> }) {
	const speedFactor = PARALLAX_SPEED_MIN + (logo.delay / MAX_LOGO_DELAY) * PARALLAX_SPEED_RANGE;
	const y = useTransform(progress, [0, 1], [PARALLAX_ENTER_Y * speedFactor, PARALLAX_EXIT_Y * speedFactor]);
	const opacity = useTransform(progress, [0, 0.18, 0.78, 1], [0, 1, 1, 0.1]);

	const positionStyle: React.CSSProperties = { top: logo.top };
	if (logo.left) {
		positionStyle.left = logo.left;
	}
	if (logo.right) {
		positionStyle.right = logo.right;
	}

	return (
		<motion.span
			className={`absolute select-none font-display text-[clamp(1.25rem,2.2vw,1.75rem)] text-foreground/15 ${logo.style}`}
			style={{ ...positionStyle, y, rotate: logo.rotate, opacity }}
		>
			{logo.name}
		</motion.span>
	);
}

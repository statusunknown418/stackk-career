"use client";

import { ArrowRightIcon, CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { Magnetic } from "@/components/ui/magnetic";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";
import { PLANS, type Plan, SINGLE_SESSION } from "./data";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;
const HEADLINE_FEATURE_COUNT = 4;

export function Pricing() {
	return (
		<section className="relative bg-background" id="planes">
			<PricingHeader />
			<PlanGrid />
			<SingleSessionStrip />
			<ClosingMoment />
		</section>
	);
}

function PricingHeader() {
	return (
		<div className="px-6 pt-20 pb-12 sm:pt-28 sm:pb-16">
			<div className="mx-auto max-w-[1200px]">
				<Reveal>
					<span className="block font-mono text-[11px] text-foreground/60 uppercase tracking-[0.11em]">
						Planes · precios en soles
					</span>
				</Reveal>
				<h2 className="mt-3 max-w-[18ch] font-bold font-display text-[clamp(2.4rem,6vw,5rem)] text-foreground leading-[0.96] tracking-[-0.045em]">
					<WordReveal>Mensual. Sin permanencia. Sin sorpresas.</WordReveal>
				</h2>
				<Reveal delay={0.2}>
					<p className="mt-7 max-w-[60ch] text-[1.05rem] text-foreground/65 leading-[1.55]">
						Empieza gratis con tu Score CV. Pasa a Pro para usar todas las herramientas de IA sin límite. Premium suma
						tu coach y el camino completo con garantía de entrevista en 90 días.
					</p>
				</Reveal>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Three comparable tiers in one row. Pro is featured; all three read as plans.
// ---------------------------------------------------------------------------
function PlanGrid() {
	return (
		<div className="px-6 pb-16">
			<div className="mx-auto grid max-w-[1200px] grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:gap-5">
				{PLANS.map((plan, idx) => (
					<PlanCard idx={idx} key={plan.id} plan={plan} />
				))}
			</div>
		</div>
	);
}

function PlanCard({ plan, idx }: { plan: Plan; idx: number }) {
	const reduced = useReducedMotion();
	const featured = plan.featured ?? false;
	const isFree = plan.priceSoles === 0;

	return (
		<motion.div
			className={cn(
				"group/price relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-300 ease-out sm:p-8",
				featured
					? "border-oxblood/55 bg-oxblood/[0.06] shadow-[0_24px_60px_-30px_oklch(from_var(--oxblood)_l_c_h/0.45)] hover:border-oxblood/80 lg:-translate-y-3"
					: "border-border bg-card hover:-translate-y-1 hover:border-foreground/35"
			)}
			initial={reduced ? false : { opacity: 0, y: 24 }}
			transition={{ duration: 0.7, delay: idx * 0.08, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-10% 0px", once: true }}
			whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
		>
			{featured && (
				<div
					aria-hidden="true"
					className="absolute -top-px right-8 left-8 h-[2px] bg-gradient-to-r from-transparent via-oxblood to-transparent"
				/>
			)}

			<div className="flex items-center justify-between gap-3">
				<h3 className="font-display font-semibold text-[1.6rem] text-foreground tracking-[-0.025em]">{plan.name}</h3>
			</div>
			<p className="mt-2 text-[14px] text-foreground/65 leading-[1.5]">{plan.tagline}</p>

			<div className="mt-7 flex items-baseline gap-1.5">
				<span className="font-medium text-base text-foreground/70">S/</span>
				<span className="font-bold font-display text-[3.4rem] text-foreground tabular-nums leading-[0.85] tracking-[-0.04em]">
					<CountUp duration={1.0} once to={plan.priceSoles} />
				</span>
				<span className="ml-1 text-foreground/70 text-sm">{isFree ? "" : "/ mes"}</span>
			</div>
			<p className="mt-2 text-[13px] text-foreground/65">{isFree ? plan.per : `≈ US$${plan.priceUsd} · ${plan.per}`}</p>

			<div className={cn("my-7 h-px", featured ? "bg-oxblood/20" : "bg-border")} />

			<div className="flex flex-1 flex-col">
				<ul className="flex flex-col gap-3">
					{plan.features.slice(0, HEADLINE_FEATURE_COUNT).map((feat, i) => (
						<FeatureItem delay={idx * 0.08 + 0.2 + i * 0.05} feature={feat} key={feat} />
					))}
				</ul>

				{plan.features.length > HEADLINE_FEATURE_COUNT && (
					<details className="group/expand mt-3">
						<summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-[12.5px] text-foreground/70 transition-colors hover:text-foreground">
							<CaretDownIcon
								className="transition-transform duration-200 group-open/expand:rotate-180"
								size={12}
								weight="bold"
							/>
							<span className="group-open/expand:hidden">+ {plan.features.length - HEADLINE_FEATURE_COUNT} más</span>
							<span className="hidden group-open/expand:inline">Ocultar</span>
						</summary>
						<ul className="mt-3 flex flex-col gap-3">
							{plan.features.slice(HEADLINE_FEATURE_COUNT).map((feat) => (
								<FeatureItem feature={feat} key={feat} />
							))}
						</ul>
					</details>
				)}
			</div>

			<Magnetic block className="mt-8" strength={0.22}>
				<a
					className={cn(
						buttonVariants({ size: "lg" }),
						"w-full",
						featured
							? "bg-oxblood text-[#0c140e] hover:bg-oxblood/90"
							: "border-foreground bg-foreground text-background hover:bg-foreground/90"
					)}
					href="/setup"
				>
					{plan.cta}
					<ArrowRightIcon weight="bold" />
				</a>
			</Magnetic>
		</motion.div>
	);
}

function FeatureItem({ feature, delay = 0 }: { delay?: number; feature: string }) {
	const reduced = useReducedMotion();
	return (
		<motion.li
			className="flex items-start gap-3 text-[14px] leading-[1.5]"
			initial={reduced ? false : { opacity: 0, x: -6 }}
			transition={{ duration: 0.5, delay, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-10% 0px", once: true }}
			whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
		>
			<span
				aria-hidden="true"
				className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-oxblood/15 text-oxblood"
			>
				<CheckIcon size={10} weight="bold" />
			</span>
			<span className="text-foreground/85">{feature}</span>
		</motion.li>
	);
}

// ---------------------------------------------------------------------------
// Single session — palate cleanser, low key, intentionally undramatic.
// ---------------------------------------------------------------------------
function SingleSessionStrip() {
	return (
		<div className="px-6 pb-16 sm:pb-24">
			<aside
				className="mx-auto max-w-[1200px] overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/35"
				id="sesion-unica"
			>
				<div className="grid items-center gap-6 p-7 sm:gap-8 sm:p-9 md:grid-cols-12">
					<div className="md:col-span-7">
						<span className="font-mono text-[10.5px] text-foreground/60 uppercase tracking-[0.09em]">
							Sin suscripción
						</span>
						<h3 className="mt-2 font-display font-semibold text-[1.6rem] text-foreground leading-[1.15] tracking-[-0.025em]">
							Sesión única: {SINGLE_SESSION.tagline}
						</h3>
						<p className="mt-3 max-w-[560px] text-[14px] text-foreground/65 leading-[1.55]">{SINGLE_SESSION.body}</p>
					</div>

					<div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:col-span-4 md:col-start-9 md:flex-col md:items-end md:text-right">
						<div>
							<p className="flex items-baseline gap-1.5">
								<span className="font-medium text-base text-foreground/70">S/</span>
								<span className="font-bold font-display text-[2.8rem] text-foreground tabular-nums leading-[0.85] tracking-[-0.04em]">
									<CountUp duration={1.0} once to={SINGLE_SESSION.priceSoles} />
								</span>
							</p>
							<p className="mt-1 text-foreground/70 text-xs">
								≈ US${SINGLE_SESSION.priceUsd} · {SINGLE_SESSION.duration}
							</p>
						</div>
						<Magnetic className="w-full shrink-0 sm:w-auto" strength={0.25}>
							<a
								className={cn(
									buttonVariants({ size: "default" }),
									"w-full justify-center border-foreground bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
								)}
								href="/setup"
							>
								{SINGLE_SESSION.cta}
								<ArrowRightIcon weight="bold" />
							</a>
						</Magnetic>
					</div>
				</div>
			</aside>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Closing moment — scroll-driven scale on the italic line. The page's coda.
// ---------------------------------------------------------------------------
function ClosingMoment() {
	const containerRef = useRef<HTMLDivElement>(null);
	const reduced = useReducedMotion();

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start end", "end start"],
	});
	const progress = useSpring(scrollYProgress, {
		stiffness: 100,
		damping: 26,
		mass: 0.4,
	});

	const dotScale = useTransform(progress, [0.1, 0.45], [0.6, 1]);
	const dotOpacity = useTransform(progress, [0.1, 0.45], [0, 1]);
	const lineOpacity = useTransform(progress, [0.18, 0.5], [0, 1]);
	const lineY = useTransform(progress, [0.18, 0.5], [40, 0]);
	const lineScale = useTransform(progress, [0.25, 0.55], [0.94, 1]);
	const bodyOpacity = useTransform(progress, [0.35, 0.7], [0, 1]);
	const bodyY = useTransform(progress, [0.35, 0.7], [20, 0]);

	return (
		<div className="relative px-6 pt-10 pb-28 sm:pt-16 sm:pb-36" ref={containerRef}>
			<div className="mx-auto max-w-[820px] border-border border-t pt-20 text-center sm:pt-28">
				<motion.span
					aria-hidden="true"
					className="inline-block size-1.5 rounded-full bg-oxblood shadow-[0_0_16px_oklch(from_var(--oxblood)_l_c_h/0.6)]"
					style={reduced ? undefined : { opacity: dotOpacity, scale: dotScale }}
				/>
				<motion.p
					className="mt-6 font-display-italic font-light text-[clamp(2rem,5vw,3.4rem)] text-foreground leading-[1.05] tracking-[-0.03em]"
					style={reduced ? undefined : { opacity: lineOpacity, y: lineY, scale: lineScale }}
				>
					¿Cumpliste tu objetivo?
				</motion.p>
				<motion.p
					className="mx-auto mt-6 max-w-[600px] text-balance text-[1.05rem] text-foreground/70 leading-[1.65]"
					style={reduced ? undefined : { opacity: bodyOpacity, y: bodyY }}
				>
					Cancelas en un clic, sin retención agresiva. <span className="text-foreground/90">Aquí te esperamos</span>{" "}
					cuando vuelvas.
				</motion.p>
			</div>
		</div>
	);
}

"use client";

import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { usePostHog } from "@posthog/react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";
import { PLANS, type Plan, SINGLE_SESSION } from "./data";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

/** Where a pricing CTA lives, so PostHog can segment landing vs. dedicated page. */
export type PricingLocation = "section" | "page";

/**
 * Per-surface class bundle. The featured plan is a solid accent slab with ink
 * text; the rest are quiet charcoal panels. Centralising the tone keeps every
 * sub-element (chip, divider, badge, checks) coherent without prop drilling.
 */
interface CardTone {
	badge: string;
	check: string;
	chip: string;
	divider: string;
	featureText: string;
	heading: string;
	link: string;
	muted: string;
	note: string;
	tag: string;
}

function cardTone(featured: boolean): CardTone {
	if (featured) {
		return {
			badge: "bg-neutral-950 text-oxblood",
			check: "bg-neutral-950/15 text-neutral-950",
			chip: "bg-neutral-950/10 text-neutral-950",
			divider: "bg-neutral-950/15",
			featureText: "text-neutral-950/85",
			heading: "text-neutral-950",
			link: "text-neutral-950",
			muted: "text-neutral-950/70",
			note: "text-neutral-950/75",
			tag: "text-neutral-950/60",
		};
	}
	return {
		badge: "bg-oxblood/15 text-oxblood",
		check: "bg-oxblood/15 text-oxblood",
		chip: "bg-foreground/8 text-foreground/75",
		divider: "bg-border",
		featureText: "text-foreground/85",
		heading: "text-foreground",
		link: "text-foreground",
		muted: "text-foreground/65",
		note: "text-foreground/70",
		tag: "text-foreground/55",
	};
}

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
			<div className="mx-auto max-w-7xl">
				<Reveal>
					<span className="block font-mono text-foreground/60 text-xs uppercase">Planes · precios en soles</span>
				</Reveal>
				<h2 className="mt-3 max-w-[18ch] font-display text-5xl text-foreground leading-none tracking-tighter">
					<WordReveal>Mensual. Sin permanencia. Sin sorpresas.</WordReveal>
				</h2>
				<Reveal delay={0.2}>
					<p className="mt-4 text-balance text-base text-foreground/65 leading-relaxed">
						Empieza gratis con tu Score CV. Pasa a Pro para 1 sesión de coaching y todas las herramientas de IA sin
						límite. Premium suma el camino completo de 3 sesiones y WhatsApp directo con garantía de entrevista en 90
						días.
					</p>
				</Reveal>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Three comparable tiers in one row. Pro is the solid accent slab; the others
// are quiet panels. A pill CTA below routes to the dedicated pricing page.
// ---------------------------------------------------------------------------
function PlanGrid() {
	return (
		<div className="px-6 pb-12">
			<div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:gap-5">
				{PLANS.map((plan, idx) => (
					<PlanCard idx={idx} key={plan.id} location="section" plan={plan} />
				))}
			</div>
			<ViewAllPlans />
		</div>
	);
}

function ViewAllPlans() {
	const posthog = usePostHog();
	return (
		<div className="mx-auto mt-10 flex max-w-7xl justify-center">
			<Link
				className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full")}
				onClick={() => posthog?.capture("pricing_view_all_clicked", { location: "section" })}
				to="/pricing"
			>
				Ver todos los planes y comparativa
				<ArrowRightIcon weight="bold" />
			</Link>
		</div>
	);
}

interface PlanCardProps {
	/** Render the full feature list (page) vs. a single highlight + link (section). */
	expanded?: boolean;
	idx: number;
	location: PricingLocation;
	plan: Plan;
}

export function PlanCard({ plan, idx, location, expanded = false }: PlanCardProps) {
	const reduced = useReducedMotion();
	const posthog = usePostHog();
	const featured = plan.featured ?? false;
	const isFree = plan.priceSoles === 0;
	const tone = cardTone(featured);

	return (
		<div className={cn("h-full", featured && "lg:-translate-y-3")}>
			<motion.article
				className={cn(
					"group/price relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-colors duration-300 sm:p-8",
					featured
						? "bg-oxblood shadow-[0_30px_80px_-32px_oklch(from_var(--oxblood)_l_c_h/0.6)]"
						: "border border-white/10 bg-white/2.5 hover:border-white/20",
					location === "page" && "scroll-mt-28"
				)}
				id={location === "page" ? plan.id : undefined}
				initial={reduced ? false : { opacity: 0, y: 24 }}
				transition={{ duration: 0.7, delay: idx * 0.08, ease: EASE_OUT_QUINT }}
				viewport={{ margin: "-10% 0px", once: true }}
				whileHover={reduced ? undefined : { y: featured ? -6 : -4 }}
				whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
			>
				{plan.chip && (
					<span
						className={cn(
							"inline-flex w-max items-center rounded-full px-2.5 py-1 font-medium text-xs uppercase",
							tone.chip
						)}
					>
						{plan.chip}
					</span>
				)}

				<h3 className={cn("mt-8 font-display text-4xl leading-none tracking-tight", tone.heading)}>{plan.name}</h3>

				<div className="mt-5 min-h-18">
					{isFree ? (
						<p className="flex items-baseline gap-2">
							<span className={cn("font-display text-5xl leading-none tracking-tight", tone.heading)}>0</span>
							<span className={cn("font-mono text-[11px] uppercase tracking-wide", tone.muted)}>/mes para siempre</span>
						</p>
					) : (
						<>
							<p className="flex items-baseline gap-1.5">
								<span className={cn("text-xl", tone.muted)}>S/</span>
								<span className={cn("font-display text-5xl tabular-nums leading-none tracking-tight", tone.heading)}>
									<CountUp duration={1} once to={plan.priceSoles} />
								</span>
								<span className={cn("ml-1 font-mono text-[11px] uppercase tracking-wide", tone.muted)}>/ mes</span>
							</p>
							<p className={cn("mt-2 text-sm", tone.muted)}>
								≈ US${plan.priceUsd} · {plan.per}
							</p>
						</>
					)}
				</div>

				<div className="mt-7 flex items-center gap-3">
					<span className={cn("whitespace-nowrap font-mono text-[11px] uppercase tracking-wide", tone.tag)}>
						{plan.tagLabel}
					</span>
					<span aria-hidden="true" className={cn("h-px flex-1", tone.divider)} />
				</div>

				<p className={cn("mt-4 text-sm leading-relaxed", tone.muted, !expanded && "min-h-10")}>
					{expanded ? plan.summary : plan.tagline}
				</p>

				<Link
					className={cn(
						featured
							? cn(
									buttonVariants({ size: "lg" }),
									"border-neutral-950 bg-neutral-950 text-neutral-50 hover:bg-neutral-950/90"
								)
							: buttonVariants({ size: "lg", variant: "outline" }),
						"mt-7 w-full"
					)}
					onClick={() => posthog?.capture("pricing_plan_cta_clicked", { location, plan: plan.id })}
					to="/login"
				>
					{plan.cta}
					<ArrowRightIcon weight="bold" />
				</Link>

				<div className="mt-8 flex flex-1 flex-col">
					<span className={cn("font-mono text-[11px] uppercase tracking-wide", tone.tag)}>Beneficios</span>
					<div className="mt-3 flex items-center gap-3">
						<span
							className={cn(
								"inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 font-display text-xl leading-none",
								tone.badge
							)}
						>
							{plan.highlight.value}
						</span>
						<span className={cn("text-sm leading-snug", tone.heading)}>{plan.highlight.label}</span>
					</div>

					{expanded ? (
						<ul className="mt-6 flex flex-col gap-3">
							{plan.features.map((feat, i) => (
								<FeatureItem delay={idx * 0.06 + i * 0.04} feature={feat} key={feat} tone={tone} />
							))}
						</ul>
					) : (
						<>
							<span aria-hidden="true" className={cn("mt-6 h-px w-full", tone.divider)} />
							<Link
								className={cn(
									"group/vb mt-5 inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline",
									tone.link
								)}
								hash={plan.id}
								onClick={() => posthog?.capture("pricing_view_details_clicked", { location, plan: plan.id })}
								to="/pricing"
							>
								Ver todos los beneficios
								<ArrowRightIcon className="transition-transform group-hover/vb:translate-x-0.5" weight="bold" />
							</Link>
						</>
					)}
				</div>
			</motion.article>
		</div>
	);
}

function FeatureItem({ feature, tone, delay = 0 }: { delay?: number; feature: string; tone: CardTone }) {
	const reduced = useReducedMotion();
	return (
		<motion.li
			className="flex items-start gap-3 text-sm leading-normal"
			initial={reduced ? false : { opacity: 0, x: -6 }}
			transition={{ duration: 0.5, delay, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-10% 0px", once: true }}
			whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
		>
			<span
				aria-hidden="true"
				className={cn("mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full", tone.check)}
			>
				<CheckIcon size={10} weight="bold" />
			</span>
			<span className={tone.featureText}>{feature}</span>
		</motion.li>
	);
}

// ---------------------------------------------------------------------------
// Single session — palate cleanser, low key, intentionally undramatic.
// ---------------------------------------------------------------------------
export function SingleSessionStrip({ location = "section" }: { location?: PricingLocation }) {
	const posthog = usePostHog();
	return (
		<div className="px-6 pb-16 sm:pb-24">
			<aside
				className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] transition-colors duration-300 hover:border-white/20"
				id="sesion-unica"
			>
				<div className="grid items-center gap-6 p-7 sm:gap-8 sm:p-9 md:grid-cols-12">
					<div className="md:col-span-7">
						<span className="font-mono text-foreground/60 text-xs uppercase">Sin suscripción</span>
						<h3 className="mt-2 font-display text-2xl text-foreground leading-tight tracking-tight">
							Sesión única: {SINGLE_SESSION.tagline}
						</h3>
						<p className="mt-3 max-w-140 text-foreground/65 text-sm leading-relaxed">{SINGLE_SESSION.body}</p>
					</div>

					<div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:col-span-4 md:col-start-9 md:flex-col md:items-end md:text-right">
						<div className="text-right">
							<p className="flex items-baseline justify-end gap-1.5 text-right">
								<span className="text-foreground/70 text-xl">S/</span>
								<span className="font-display text-6xl text-foreground tabular-nums leading-none tracking-tighter">
									<CountUp duration={1.0} once to={SINGLE_SESSION.priceSoles} />
								</span>
							</p>
							<p className="mt-1 text-foreground/70">
								≈ US${SINGLE_SESSION.priceUsd} · {SINGLE_SESSION.duration}
							</p>
						</div>
						<Link
							className={cn(buttonVariants({ size: "default", variant: "outline" }), "w-full shrink-0 sm:w-auto")}
							onClick={() => posthog?.capture("pricing_single_session_clicked", { location })}
							to="/login"
						>
							{SINGLE_SESSION.cta}
							<ArrowRightIcon weight="bold" />
						</Link>
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
			<div className="mx-auto max-w-205 border-border border-t pt-20 text-center sm:pt-28">
				<motion.span
					aria-hidden="true"
					className="inline-block size-1.5 rounded-full bg-oxblood shadow-[0_0_16px_oklch(from_var(--oxblood)_l_c_h/0.6)]"
					style={reduced ? undefined : { opacity: dotOpacity, scale: dotScale }}
				/>
				<motion.p
					className="mt-6 font-display-italic font-light text-[clamp(2rem,5vw,3.4rem)] text-foreground leading-none tracking-tight"
					style={reduced ? undefined : { opacity: lineOpacity, y: lineY, scale: lineScale }}
				>
					¿Cumpliste tu objetivo?
				</motion.p>
				<motion.p
					className="mx-auto mt-6 max-w-150 text-balance text-base text-foreground/70 leading-relaxed"
					style={reduced ? undefined : { opacity: bodyOpacity, y: bodyY }}
				>
					Cancelas en un clic, sin retención agresiva. <span className="text-foreground/90">Aquí te esperamos</span>{" "}
					cuando vuelvas.
				</motion.p>
			</div>
		</div>
	);
}

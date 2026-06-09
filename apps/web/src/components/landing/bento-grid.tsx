import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WHY_REASONS } from "./data";

const LEADING_NUMBER_RE = /^(\d+)(\s.*)?$/;

// Splits a receipt value like "8 países de habla hispana" into a leading
// integer and the trailing text, so the number can animate via CountUp while
// the rest of the string stays static. Returns null when no leading int.
function splitLeadingNumber(value: string): { number: number; rest: string } | null {
	const match = value.match(LEADING_NUMBER_RE);
	if (!match) {
		return null;
	}
	const parsed = Number.parseInt(match[1], 10);
	if (Number.isNaN(parsed)) {
		return null;
	}
	return { number: parsed, rest: match[2] ?? "" };
}

export function BentoGrid() {
	return (
		<div id="features">
			<ReasonsStrip />
		</div>
	);
}

function ReasonsStrip() {
	const [r01, _r02, r03, r04] = WHY_REASONS;

	return (
		<section className="bg-background">
			{/* Section intro — same paper, no green chrome yet, just the editorial frame */}
			<div className="px-6 pt-16 pb-4 md:pt-24 md:pb-6">
				<Reveal>
					<header className="mx-auto max-w-6xl">
						<div className="flex items-center gap-2 font-mono text-foreground text-xs uppercase">
							<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
							<span>El producto</span>
						</div>

						<h2 className="mt-3 max-w-215 font-display text-4xl text-foreground leading-none tracking-tight">
							<WordReveal>Una suscripción que reúne las herramientas para asegurar tu próxima entrevista.</WordReveal>
						</h2>
						<p className="mt-4 text-balance text-foreground/60 text-xl leading-relaxed">
							Un Agente especializado de IA y un coach senior, juntos para potenciarte.
						</p>
					</header>
				</Reveal>
			</div>

			{/* The three supporting reasons — sticky stacking cards */}
			<ReasonsStack reasons={[r01, r03, r04]} />
		</section>
	);
}

// =====================================================================
// REASONS STACK — sticky stacking cards (concard "Cómo utilizar" energy).
//
// A tall scroll wrapper gives the stack room to play out. Each card is
// position: sticky with a `top` offset that grows per index, so as the
// reader scrolls each card sticks to the viewport and the next one rises
// up and lands ON TOP, leaving a thin strip of the card beneath peeking
// at the top. A subtle scroll-driven scale + opacity makes the covered
// card recede.
//
// Desktop/motion only. On small screens or with reduced motion we render
// a plain non-sticky vertical stack — the sticky choreography is a pure
// enhancement, never load-bearing for the content.
// =====================================================================

// Per-card sticky offset: card i sticks `STACK_TOP_BASE + i * STACK_TOP_STEP`
// below the viewport top. The step is what reveals the sliver beneath.
const STACK_TOP_BASE_REM = 10;
const STACK_TOP_STEP_REM = 5;

function ReasonsStack({ reasons }: { reasons: (typeof WHY_REASONS)[number][] }) {
	const reduced = useReducedMotion() ?? false;
	const isDesktop = useMediaQuery("md");
	const sticky = isDesktop && !reduced;

	// Static fallback — normal flow, no sticky, no transforms.
	if (!sticky) {
		return (
			<div className="px-6 pt-12 pb-20 md:pt-16 md:pb-28">
				<div className="mx-auto flex max-w-6xl flex-col gap-6">
					{reasons.map((reason, i) => (
						<Reveal delay={i * 0.06} key={reason.title}>
							<StaticReasonCard displayNumber={formatStackNumber(i)} reason={reason} />
						</Reveal>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="px-6 pt-8 pb-20 md:pb-28">
			{/* Wrapper height = one card screen per reason. Extra room at the end
			    lets the final card settle before the section releases. */}
			<div className="relative mx-auto w-full max-w-6xl">
				{reasons.map((reason, i) => (
					<StackReasonCard displayNumber={formatStackNumber(i)} index={i} key={reason.title} reason={reason} />
				))}
			</div>
		</div>
	);
}

// 0 → "01", 1 → "02" … keeps the editorial two-digit ghost numbering.
function formatStackNumber(index: number): string {
	return String(index + 1).padStart(2, "0");
}

// One sticky card. Owns its own useScroll/useTransform so hooks stay top-level
// (mapping hooks in the parent would violate rules-of-hooks). As the next card
// scrolls over this one, this card scales down slightly and dims.
function StackReasonCard({
	reason,
	displayNumber,
	index,
}: {
	reason: (typeof WHY_REASONS)[number];
	displayNumber: string;
	index: number;
}) {
	const cardRef = useRef<HTMLDivElement>(null);

	// Track this card from when its top hits the viewport top until it has
	// scrolled fully past — i.e. while the next card slides up to cover it.
	const { scrollYProgress } = useScroll({
		target: cardRef,
		offset: ["start start", "end start"],
	});

	const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
	const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.6]);

	const leading = splitLeadingNumber(reason.receipt.value);

	return (
		<motion.article
			className={
				"relative mb-[5vh] flex min-h-[35vh] flex-col overflow-hidden rounded-xl border bg-card p-8 text-right shadow-xl"
			}
			ref={cardRef}
			style={{
				position: "sticky",
				top: `calc(${STACK_TOP_BASE_REM}rem + ${index * STACK_TOP_STEP_REM}rem)`,
				scale,
				opacity,
				transformOrigin: "center top",
			}}
		>
			{/* Big ghost number — the editorial anchor for each reason */}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -top-4 left-2 select-none font-bold font-display text-[clamp(11rem,22vw,15rem)] text-muted-foreground/10 tabular-nums leading-none tracking-tighter"
			>
				{displayNumber}
			</span>

			<header className="relative flex items-center justify-end gap-2">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
				<span className="font-medium font-mono text-oxblood text-xs uppercase">Razón {displayNumber}</span>
			</header>

			<h3 className="relative mt-8 font-display font-medium text-3xl text-foreground leading-none tracking-tight">
				{reason.title} <span className="font-display-italic font-extralight">{reason.emphasis}</span>
			</h3>

			<p className="relative mt-4 text-balance text-lg text-muted-foreground leading-tight">{reason.body}</p>

			<footer className="relative mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-border border-t pt-6">
				<span className="font-mono text-foreground/55 text-xs uppercase">{reason.receipt.label}</span>
				<span className="font-display text-[clamp(0.95rem,1.4vw,1.2rem)] text-foreground tracking-tight">
					{leading ? (
						<>
							<CountUp duration={0.8} once to={leading.number} />
							{leading.rest}
						</>
					) : (
						reason.receipt.value
					)}
				</span>
			</footer>
		</motion.article>
	);
}

// Non-sticky variant used in the reduced-motion / mobile fallback.
function StaticReasonCard({ reason, displayNumber }: { reason: (typeof WHY_REASONS)[number]; displayNumber: string }) {
	const leading = splitLeadingNumber(reason.receipt.value);
	return (
		<article className="w-full">
			{/* Big ghost number — the editorial anchor for each reason */}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -top-4 right-2 select-none font-bold font-display text-[clamp(11rem,22vw,15rem)] text-muted-foreground/10 tabular-nums leading-none tracking-tighter"
			>
				{displayNumber}
			</span>

			<header className="relative flex items-center gap-2">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
				<span className="font-medium font-mono text-oxblood text-xs uppercase">Razón {displayNumber}</span>
			</header>

			<h3 className="relative mt-6 max-w-[18ch] font-display font-medium text-3xl text-foreground leading-none tracking-tight">
				{reason.title} <span className="font-display-italic font-extralight">{reason.emphasis}</span>
			</h3>

			<p className="relative mt-5 max-w-[52ch] text-muted-foreground text-xl leading-tight">{reason.body}</p>

			<footer className="relative mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-border border-t pt-6">
				<span className="font-mono text-foreground/55 text-xs uppercase">{reason.receipt.label}</span>
				<span className="font-display text-[clamp(0.95rem,1.4vw,1.2rem)] text-foreground tracking-tight">
					{leading ? (
						<>
							<CountUp duration={0.8} once to={leading.number} />
							{leading.rest}
						</>
					) : (
						reason.receipt.value
					)}
				</span>
			</footer>
		</article>
	);
}

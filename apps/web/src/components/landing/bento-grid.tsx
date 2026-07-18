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
		<div className="scroll-mt-24" id="features">
			<ReasonsStrip />
		</div>
	);
}

function ReasonsStrip() {
	const [r01, _r02, r03, r04] = WHY_REASONS;

	return (
		<section className="bg-background">
			{/* Section intro — same paper, no green chrome yet, just the editorial frame */}
			<div className="px-4 pt-14 pb-4 sm:px-6 sm:pt-16 md:pt-24 md:pb-6">
				<Reveal>
					<header className="mx-auto max-w-7xl">
						<div className="flex items-center gap-2 font-mono text-foreground text-xs uppercase">
							<span aria-hidden="true" className="h-px w-6 bg-oxblood" />
							<span>El producto</span>
						</div>

						<h2 className="mt-3 max-w-200 font-display text-[clamp(2.5rem,12vw,3rem)] text-foreground leading-[0.96] tracking-tight sm:text-4xl sm:leading-none">
							<WordReveal>Una suscripción que reúne las herramientas para asegurar tu próxima entrevista.</WordReveal>
						</h2>
						<p className="mt-4 text-balance text-base text-foreground/60 leading-relaxed sm:text-xl">
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
			<div className="px-4 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-20 md:pt-16 md:pb-28">
				<div className="mx-auto flex max-w-7xl flex-col gap-8 sm:gap-10">
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
			<div className="relative mx-auto w-full max-w-7xl">
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
				"relative mb-[5vh] flex min-h-[35vh] min-w-full flex-col overflow-hidden rounded-xl border bg-card p-8 text-right shadow-xl"
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
		<article className="relative w-full overflow-hidden border-border border-b pb-8 last:border-b-0 last:pb-0">
			{/* Big ghost number — the editorial anchor for each reason */}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -top-2 right-0 select-none font-display text-[7.5rem] text-muted-foreground/8 tabular-nums leading-none tracking-tighter sm:text-[9rem]"
			>
				{displayNumber}
			</span>

			<header className="relative flex items-center gap-2">
				<span aria-hidden="true" className="h-px w-5 bg-oxblood" />
				<span className="font-medium font-mono text-oxblood text-xs uppercase">Razón {displayNumber}</span>
			</header>

			<h3 className="relative mt-5 max-w-[18ch] font-display font-medium text-2xl text-foreground leading-[1.02] tracking-tight sm:text-3xl">
				{reason.title} <span className="font-display-italic font-extralight">{reason.emphasis}</span>
			</h3>

			<p className="relative mt-4 max-w-[52ch] text-base text-muted-foreground leading-relaxed sm:mt-5 sm:text-xl sm:leading-tight">
				{reason.body}
			</p>

			<footer className="relative mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-border border-t pt-5">
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

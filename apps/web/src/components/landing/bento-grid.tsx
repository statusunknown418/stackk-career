import {
	type MotionValue,
	motion,
	useMotionValueEvent,
	useReducedMotion,
	useScroll,
	useSpring,
	useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
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

// Locale-aware integer formatter used by the scroll-driven price counter.
const INT_FORMATTER = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

export function BentoGrid() {
	return (
		<div id="features">
			<ReasonsStrip />
		</div>
	);
}

function ReasonsStrip() {
	const [r01, r02, r03, r04] = WHY_REASONS;

	return (
		<section className="bg-background">
			{/* Section intro — same paper, no green chrome yet, just the editorial frame */}
			<div className="px-6 pt-16 pb-4 md:pt-24 md:pb-6">
				<Reveal>
					<header className="mx-auto max-w-7xl">
						<div className="flex items-center gap-2 font-mono text-foreground text-xs uppercase tracking-widest">
							<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
							<span>El producto</span>
						</div>
						<h2 className="mt-3 max-w-[860px] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-none tracking-tight">
							<WordReveal>Una suscripción que reúne las herramientas que te aseguran tu próxima entrevista.</WordReveal>
						</h2>
						<p className="mt-5 max-w-[620px] text-base text-foreground/65 leading-relaxed">
							Un Agente especializado de IA y un coach senior, juntos para potenciarte.
						</p>
					</header>
				</Reveal>
			</div>

			{/* The pinned price moment — consumes reason 02 (Wonsulting wedge) */}
			<PinnedPriceMoment reason={r02} />

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
const STACK_TOP_BASE_REM = 7;
const STACK_TOP_STEP_REM = 1.75;

function ReasonsStack({ reasons }: { reasons: (typeof WHY_REASONS)[number][] }) {
	const reduced = useReducedMotion() ?? false;
	const isDesktop = useIsDesktop();
	const sticky = isDesktop && !reduced;

	// Static fallback — normal flow, no sticky, no transforms.
	if (!sticky) {
		return (
			<div className="px-6 pt-12 pb-20 md:pt-16 md:pb-28">
				<div className="mx-auto flex max-w-[1000px] flex-col gap-6">
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
		<div className="px-6 pt-12 pb-20 md:pt-16 md:pb-28">
			{/* Wrapper height = one card screen per reason. Extra room at the end
			    lets the final card settle before the section releases. */}
			<div className="relative mx-auto max-w-[1000px]">
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

// Shared card chrome for the stack — large, premium, opaque (so a stacked
// card fully hides the one it covers except the peeking sliver at the top).
const STACK_CARD_CLASS =
	"relative flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-[0_24px_60px_-28px_oklch(0.13_0_0/0.22)] md:p-12";

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

	const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
	const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.6]);

	const leading = splitLeadingNumber(reason.receipt.value);

	return (
		<motion.article
			className={`${STACK_CARD_CLASS} mb-[6vh]`}
			ref={cardRef}
			style={{
				position: "sticky",
				top: `calc(${STACK_TOP_BASE_REM}rem + ${index * STACK_TOP_STEP_REM}rem)`,
				scale,
				opacity,
				transformOrigin: "center top",
			}}
		>
			<ReasonCardContent displayNumber={displayNumber} leading={leading} reason={reason} />
		</motion.article>
	);
}

// Non-sticky variant used in the reduced-motion / mobile fallback.
function StaticReasonCard({ reason, displayNumber }: { reason: (typeof WHY_REASONS)[number]; displayNumber: string }) {
	const leading = splitLeadingNumber(reason.receipt.value);
	return (
		<article className={STACK_CARD_CLASS}>
			<ReasonCardContent displayNumber={displayNumber} leading={leading} reason={reason} />
		</article>
	);
}

// The shared inner composition — big ghost number, eyebrow, title + italic
// emphasis, body, and the receipt footer. Reused by both card variants so the
// sticky and static paths can never drift apart.
function ReasonCardContent({
	reason,
	displayNumber,
	leading,
}: {
	reason: (typeof WHY_REASONS)[number];
	displayNumber: string;
	leading: { number: number; rest: string } | null;
}) {
	return (
		<>
			{/* Big ghost number — the editorial anchor for each reason */}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute top-[-2.5rem] right-[-1rem] select-none font-bold font-display text-[clamp(11rem,22vw,18rem)] text-foreground/[0.05] leading-none tracking-tighter"
			>
				{displayNumber}
			</span>

			<header className="relative flex items-center gap-2">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
				<span className="font-medium font-mono text-foreground text-xs uppercase tracking-widest">
					Razón {displayNumber}
				</span>
			</header>

			<h3 className="relative mt-6 max-w-[18ch] font-display font-semibold text-[clamp(1.75rem,3.2vw,2.75rem)] text-foreground leading-[1.05] tracking-tight">
				{reason.title} <span className="font-display-italic font-light">{reason.emphasis}</span>
			</h3>

			<p className="relative mt-5 max-w-[52ch] text-[clamp(1rem,1.4vw,1.125rem)] text-foreground/65 leading-relaxed">
				{reason.body}
			</p>

			<footer className="relative mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-border border-t pt-6">
				<span className="font-mono text-foreground/55 text-xs uppercase tracking-widest">{reason.receipt.label}</span>
				<span className="font-display font-semibold text-[clamp(0.95rem,1.4vw,1.2rem)] text-foreground tracking-tight">
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
		</>
	);
}

// =====================================================================
// PINNED PRICE MOMENT — the page's punch line.
//
// A tall scroll container (~220vh) wraps a 100vh sticky viewport. As the
// reader scrolls through the container, scrollYProgress drives every
// element in the viewport. This forces the reader to absorb the price
// gap before continuing — that is the entire point.
//
// Scroll choreography (by scrollYProgress):
//   0.00 to 0.12 — green corner block scales in, header chrome reveals
//   0.05 to 0.22 — "Ellos" column label + US$2,299 enter (low end)
//   0.18 to 0.34 — US$699 enters beside it
//   0.34 to 0.50 — strike line draws across both prices (origin-left scaleX)
//   0.46 to 0.66 — italic "vs" scales 0.55 to 1, rotates -8deg to 0
//   0.62 to 0.82 — "Nosotros" column label + "S/" mark enter
//   0.70 to 0.92 — S/ counter scrubs from 2299 down to 79
//   0.88 to 1.00 — body paragraph + receipt footer settle
//   The bottom rail (mono progress bar) scrubs across throughout.
// =====================================================================

interface PinnedPriceMomentProps {
	reason: (typeof WHY_REASONS)[number];
}

// Helper — clamped linear fade utility for legibility. Motion's useTransform
// already clamps by default when given matched-length input/output arrays.
// Named with the `use` prefix so React's hooks lint sees it as a custom hook.
function useRangeFade(scroll: MotionValue<number>, enter: number, settle: number) {
	return useTransform(scroll, [enter, settle], [0, 1]);
}

function PinnedPriceMoment({ reason }: PinnedPriceMomentProps) {
	const reduced = useReducedMotion() ?? false;
	const isDesktop = useIsDesktop();

	// Gate BEFORE any useScroll-with-target hook. The scrub lives in its own
	// child so useScroll only runs when its target element is actually mounted.
	// Calling useScroll here and then returning the static branch (no ref)
	// makes motion throw "Target ref is defined but not hydrated".
	if (reduced || !isDesktop) {
		return (
			<div className="px-6 py-8">
				<div className="mx-auto max-w-7xl">
					<StaticPriceComposition reason={reason} />
				</div>
			</div>
		);
	}

	return <PinnedPriceScrub reason={reason} />;
}

function PinnedPriceScrub({ reason }: PinnedPriceMomentProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start 80%", "end end"],
	});

	// Faster spring — tracks the wheel more tightly so the counter doesn't lag.
	const progress = useSpring(scrollYProgress, {
		stiffness: 180,
		damping: 30,
		mass: 0.3,
	});

	// With offset ["start 80%", "end end"], progress starts when the section is
	// already 20% inside the viewport. Pin engages somewhere around progress 0.15–0.2,
	// so entry ramps complete by then and the card is fully revealed when pinned.

	const cornerScale = useTransform(progress, [0.0, 0.12], [0.7, 1]);
	const cornerOpacity = useTransform(progress, [0.0, 0.12], [0, 1]);

	const headerOpacity = useRangeFade(progress, 0.04, 0.16);
	const headerY = useTransform(progress, [0.04, 0.16], [10, 0]);

	const titleOpacity = useRangeFade(progress, 0.08, 0.2);
	const titleY = useTransform(progress, [0.08, 0.2], [14, 0]);

	// During-pin choreography (offset start-80%, pin engages ~progress 0.2).

	const price2299Opacity = useRangeFade(progress, 0.26, 0.36);
	const price2299Y = useTransform(progress, [0.26, 0.36], [16, 0]);

	const ellosSubOpacity = useRangeFade(progress, 0.34, 0.44);

	// Strike line — drawn across the price
	const strikeScale = useTransform(progress, [0.42, 0.54], [0, 1]);

	// vs — italic punctuation, scale + rotate
	const vsScale = useTransform(progress, [0.5, 0.66], [0.55, 1]);
	const vsOpacity = useTransform(progress, [0.5, 0.62], [0, 1]);
	const vsRotate = useTransform(progress, [0.5, 0.66], [-8, 0]);

	// Nosotros — right side
	const solesMarkOpacity = useRangeFade(progress, 0.66, 0.76);
	const solesMarkY = useTransform(progress, [0.66, 0.76], [12, 0]);

	// The big number — scroll-scrubbed counter from 250 down to 79. Climax.
	const counterValue = useTransform(progress, [0.7, 0.9], [250, 79]);
	const counterText = useTransform(counterValue, (v) => INT_FORMATTER.format(Math.max(79, Math.round(v))));

	const numberOpacity = useRangeFade(progress, 0.66, 0.76);

	const perMesOpacity = useRangeFade(progress, 0.78, 0.86);
	const nosotrosSubOpacity = useRangeFade(progress, 0.82, 0.9);

	// Bottom rail — the scrubbing progress indicator. Tracks raw scrollYProgress
	// (not the spring) so it feels exactly tied to the wheel.
	const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

	return (
		// Tall container — its height determines how long the section stays pinned.
		// 220vh: ~120vh of pinned scrubbing past the initial pin attachment.
		<div className="relative h-[108vh]" ref={containerRef}>
			<div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-background px-6">
				<article className="relative mx-auto flex w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-14">
					{/* Green corner block — the brand anchor. Scroll-linked scale. */}
					<motion.span
						aria-hidden="true"
						className="pointer-events-none absolute top-0 right-0 h-40 w-40 origin-top-right bg-oxblood md:h-56 md:w-56"
						style={{
							scale: cornerScale,
							opacity: cornerOpacity,
							clipPath: "polygon(100% 0, 100% 100%, 0 0)",
						}}
					/>

					{/* Header chrome — Razón 02 meta */}
					<motion.header className="relative flex items-center gap-2" style={{ opacity: headerOpacity, y: headerY }}>
						<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
						<span className="font-medium font-mono text-foreground text-xs uppercase tracking-widest">El precio</span>
					</motion.header>

					{/* Title */}
					<motion.h3
						className="relative mt-5 max-w-[24ch] font-display font-semibold text-[clamp(1.75rem,3vw,2.5rem)] text-foreground leading-[1.04] tracking-[-0.028em]"
						style={{ opacity: titleOpacity, y: titleY }}
					>
						{reason.title} <span className="font-display-italic font-light">{reason.emphasis}</span>
					</motion.h3>

					{/* The math — three columns: Ellos / vs / Nosotros */}
					<div className="relative mt-10 grid grid-cols-1 items-start gap-x-10 gap-y-8 md:mt-14 md:grid-cols-[1fr_auto_1fr]">
						{/* ELLOS — Wonsulting side */}
						<div className="flex flex-col items-start text-left md:items-end md:text-right">
							{/* Both prices with a single strike that sweeps across them */}
							<div className="relative mt-3 flex w-fit flex-wrap items-baseline gap-x-4 gap-y-1">
								<motion.span
									className="flex items-baseline gap-1 font-display font-medium text-[clamp(2.5rem,5vw,4rem)] text-foreground/55 leading-none tracking-tighter"
									style={{ opacity: price2299Opacity, y: price2299Y }}
								>
									<span className="font-medium text-[0.55em] text-foreground/55">S/</span>
									250
								</motion.span>

								{/* Drawn strike — scaleX origin-left, scroll-linked.
								    Sits over both prices, sweeping across in sync with scroll. */}
								<motion.span
									aria-hidden="true"
									className="pointer-events-none absolute inset-x-0 top-1/2 h-[2.5px] origin-left bg-foreground/70"
									style={{ scaleX: strikeScale }}
								/>
							</div>

							<motion.span
								className="mt-3 font-mono text-foreground/55 text-xs uppercase tracking-widest"
								style={{ opacity: ellosSubOpacity }}
							>
								Pagas más por menos
							</motion.span>
						</div>

						{/* VS — italic punctuation, the pivot */}
						<motion.span
							aria-hidden="true"
							className="origin-center self-center justify-self-center font-display-italic font-light text-[clamp(3rem,6vw,5.5rem)] text-foreground/30 leading-none"
							style={{ scale: vsScale, opacity: vsOpacity, rotate: vsRotate }}
						>
							vs
						</motion.span>

						{/* NOSOTROS — ASSENDIA side */}
						<div className="flex flex-col items-end text-right md:items-start md:text-left">
							<div className="mt-3 flex items-baseline gap-2">
								<motion.span
									className="font-bold font-display text-[clamp(3rem,5.6vw,4.5rem)] text-foreground leading-none tracking-tighter"
									style={{ opacity: solesMarkOpacity, y: solesMarkY }}
								>
									S/
								</motion.span>
								<motion.span
									aria-live="polite"
									className="font-bold font-display text-[clamp(3rem,5.6vw,4.5rem)] text-foreground tabular-nums leading-none tracking-tighter"
									style={{ opacity: numberOpacity }}
								>
									{counterText}
								</motion.span>
								<motion.span
									className="font-mono text-foreground/60 text-xs tracking-tight"
									style={{ opacity: perMesOpacity }}
								>
									/mes
								</motion.span>
							</div>

							<motion.span
								className="mt-3 font-mono text-foreground/65 text-xs uppercase tracking-widest"
								style={{ opacity: nosotrosSubOpacity }}
							>
								Pagas menos por mucho más
							</motion.span>
						</div>
					</div>

					{/* Scroll progress rail — bottom edge of the card */}
					<ScrollProgressRail progress={scrollYProgress} railScale={railScale} />
				</article>
			</div>
		</div>
	);
}

interface ScrollProgressRailProps {
	progress: MotionValue<number>;
	railScale: MotionValue<number>;
}

// Bottom rail — a thin oxblood bar scrubbing across, plus 5 mono dots that
// light up at each beat in the choreography. Helps the reader feel oriented
// inside the pin: "I'm 60% through this idea."
function ScrollProgressRail({ progress, railScale }: ScrollProgressRailProps) {
	const [activeDot, setActiveDot] = useState(0);
	// Aligned to the during-pin choreography milestones (entry < 0.2).
	const dotPositions = [0.28, 0.4, 0.54, 0.66, 0.9] as const;

	useMotionValueEvent(progress, "change", (v) => {
		// Walk the thresholds and pick the largest index whose threshold is
		// reached. Cheap, no allocations beyond the let.
		let idx = 0;
		for (let i = 0; i < dotPositions.length; i++) {
			if (v >= dotPositions[i] - 0.04) {
				idx = i;
			}
		}
		if (idx !== activeDot) {
			setActiveDot(idx);
		}
	});

	return (
		<div className="relative mt-10 flex items-center gap-4 border-border border-t pt-5">
			<span className="font-mono text-foreground/55 text-xs uppercase tracking-widest">El argumento</span>

			{/* Thin scrubbing bar */}
			<div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-border">
				<motion.span
					aria-hidden="true"
					className="absolute inset-y-0 left-0 origin-left rounded-full bg-oxblood"
					style={{ scaleX: railScale, width: "100%" }}
				/>
			</div>

			{/* Mono dots — beat indicators */}
			<div className="flex items-center gap-2">
				{dotPositions.map((pos, i) => (
					<span
						aria-hidden="true"
						className={`size-1.5 rounded-full transition-colors duration-300 ${
							i <= activeDot ? "bg-oxblood" : "bg-border"
						}`}
						key={pos}
					/>
				))}
			</div>
		</div>
	);
}

// Reduced-motion fallback — the same composition, fully revealed, no scrub.
// Kept simple deliberately: no surprise reveals when the user has asked for
// less motion. The price gap still reads loud and clear.
function StaticPriceComposition({ reason }: { reason: (typeof WHY_REASONS)[number] }) {
	return (
		<article className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-14">
			<span
				aria-hidden="true"
				className="pointer-events-none absolute top-0 right-0 h-40 w-40 bg-oxblood md:h-56 md:w-56"
				style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
			/>

			<header className="relative flex items-center gap-2">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
				<span className="font-medium font-mono text-foreground text-xs uppercase tracking-widest">El precio</span>
			</header>

			<h3 className="relative mt-5 max-w-[24ch] font-display font-semibold text-[clamp(1.75rem,3vw,2.5rem)] text-foreground leading-[1.04] tracking-[-0.028em]">
				{reason.title} <span className="font-display-italic font-light">{reason.emphasis}</span>
			</h3>

			<div className="relative mt-10 grid grid-cols-1 items-start gap-x-10 gap-y-6 md:grid-cols-[1fr_auto_1fr]">
				<div className="flex flex-col items-start text-left md:items-end md:text-right">
					<div className="relative mt-3 flex w-fit flex-wrap items-baseline gap-x-4">
						<span className="relative flex items-baseline gap-1 font-display font-medium text-[clamp(2.5rem,5vw,4rem)] text-foreground/55 leading-none tracking-tighter">
							<span className="font-medium text-[0.55em] text-foreground/55">S/</span>
							250
						</span>
						<span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-[2.5px] bg-foreground/70" />
					</div>
					<span className="mt-3 font-mono text-foreground/55 text-xs uppercase tracking-widest">
						Pagas más por menos
					</span>
				</div>

				<span
					aria-hidden="true"
					className="self-center justify-self-center font-display-italic font-light text-[clamp(3rem,6vw,5.5rem)] text-foreground/30 leading-none"
				>
					vs
				</span>

				<div className="flex flex-col items-end text-right md:items-start md:text-left">
					<div className="mt-3 flex items-baseline gap-2">
						<span className="font-bold font-display text-[clamp(3rem,5.6vw,4.5rem)] text-foreground leading-none tracking-tighter">
							S/
							<CountUp duration={1.0} once to={79} />
						</span>
						<span className="font-mono text-foreground/60 text-xs tracking-tight">/mes</span>
					</div>
					<span className="mt-3 font-mono text-foreground/65 text-xs uppercase tracking-widest">
						Pagas menos por mucho más
					</span>
				</div>
			</div>
		</article>
	);
}

// matchMedia hook — drives the pinned/static split. Below 900px we drop the
// scroll-pinned scrub for the static composition (mirrors how-it-works.tsx).
// SSR-safe: starts false so the static fallback renders first, then syncs.
function useIsDesktop(breakpoint = 900): boolean {
	const [isDesktop, setIsDesktop] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
		const sync = () => setIsDesktop(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, [breakpoint]);
	return isDesktop;
}

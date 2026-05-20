import {
	type MotionValue,
	motion,
	useInView,
	useMotionValueEvent,
	useReducedMotion,
	useScroll,
	useSpring,
	useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { WHY_REASONS } from "./data";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;
const IN_VIEW_OPTIONS = { once: true, margin: "-15% 0px" } as const;
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

// Shared card chrome — light theme. Off-white card on white paper, solid hairline.
// Hover lifts the card with a soft shadow and accents the border green (concard energy).
const CARD_BASE =
	"group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-oxblood/50 hover:shadow-[0_12px_32px_-12px_oklch(0.13_0_0/0.12)]";

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
			<div className="px-6 pt-16 pb-10 md:pt-24 md:pb-14">
				<Reveal>
					<header className="mx-auto max-w-[1200px]">
						<div className="flex items-center gap-2 font-mono text-[11px] text-foreground uppercase tracking-[0.22em]">
							<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
							<span>El producto</span>
						</div>
						<h2 className="mt-3 max-w-[860px] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
							<WordReveal>Una sola suscripción. Reemplaza seis herramientas sueltas.</WordReveal>
						</h2>
						<p className="mt-5 max-w-[620px] text-[1rem] text-foreground/65 leading-[1.55]">
							IA y coach humano senior. Lo que en otras plataformas pagas por separado.
						</p>
					</header>
				</Reveal>
			</div>

			{/* The pinned price moment — consumes reason 02 (Wonsulting wedge) */}
			<PinnedPriceMoment reason={r02} />

			{/* The three supporting reasons — single row below the pinned moment */}
			<div className="px-6 pt-12 pb-20 md:pt-16 md:pb-28">
				<div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-3 md:grid-cols-3">
					<Reveal delay={0.05}>
						<SupportingCell reason={r01} />
					</Reveal>
					<Reveal delay={0.12}>
						<SupportingCell reason={r03} />
					</Reveal>
					<Reveal delay={0.19}>
						<SupportingCell reason={r04} />
					</Reveal>
				</div>
			</div>
		</section>
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

	const ellosLabelOpacity = useRangeFade(progress, 0.22, 0.32);
	const ellosLabelY = useTransform(progress, [0.22, 0.32], [10, 0]);

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
	const nosotrosLabelOpacity = useRangeFade(progress, 0.62, 0.72);
	const nosotrosLabelY = useTransform(progress, [0.62, 0.72], [10, 0]);

	const solesMarkOpacity = useRangeFade(progress, 0.66, 0.76);
	const solesMarkY = useTransform(progress, [0.66, 0.76], [12, 0]);

	// The big number — scroll-scrubbed counter from 250 down to 79. Climax.
	const counterValue = useTransform(progress, [0.7, 0.9], [250, 79]);
	const counterText = useTransform(counterValue, (v) => INT_FORMATTER.format(Math.max(79, Math.round(v))));

	const numberOpacity = useRangeFade(progress, 0.66, 0.76);

	const perMesOpacity = useRangeFade(progress, 0.78, 0.86);
	const nosotrosSubOpacity = useRangeFade(progress, 0.82, 0.9);

	// Body paragraph + receipt
	const bodyOpacity = useRangeFade(progress, 0.88, 0.96);
	const bodyY = useTransform(progress, [0.88, 0.96], [10, 0]);

	const footerOpacity = useRangeFade(progress, 0.92, 1);

	// Bottom rail — the scrubbing progress indicator. Tracks raw scrollYProgress
	// (not the spring) so it feels exactly tied to the wheel.
	const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

	// Reduced-motion fallback: render the whole composition statically, fully
	// revealed, inside a normal (non-pinned) container. No scrub, no surprises.
	if (reduced) {
		return (
			<div className="px-6 py-8">
				<div className="mx-auto max-w-[1200px]">
					<StaticPriceComposition reason={reason} />
				</div>
			</div>
		);
	}

	return (
		// Tall container — its height determines how long the section stays pinned.
		// 220vh: ~120vh of pinned scrubbing past the initial pin attachment.
		<div className="relative h-[170vh]" ref={containerRef}>
			<div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-background px-6">
				<article className="relative mx-auto flex w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-14">
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
						<span className="font-medium font-mono text-[10.5px] text-foreground uppercase tracking-[0.24em]">
							Razón {reason.number} · el precio
						</span>
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
						<div className="flex flex-col">
							<motion.span
								className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.22em]"
								style={{ opacity: ellosLabelOpacity, y: ellosLabelY }}
							>
								Otros · paquete suelto
							</motion.span>

							{/* Both prices with a single strike that sweeps across them */}
							<div className="relative mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
								<motion.span
									className="flex items-baseline gap-1 font-display font-medium text-[clamp(2.5rem,5vw,4rem)] text-foreground/45 leading-none tracking-[-0.04em]"
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
								className="mt-3 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.18em]"
								style={{ opacity: ellosSubOpacity }}
							>
								Paquete completo · piezas sueltas
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
						<div className="flex flex-col">
							<motion.span
								className="font-mono text-[10px] text-foreground uppercase tracking-[0.22em]"
								style={{ opacity: nosotrosLabelOpacity, y: nosotrosLabelY }}
							>
								Nosotros · ASSENDIA · todo incluido
							</motion.span>

							<div className="mt-3 flex items-baseline gap-2">
								<motion.span
									className="font-bold font-display text-[clamp(3rem,5.6vw,4.5rem)] text-foreground leading-none tracking-[-0.045em]"
									style={{ opacity: solesMarkOpacity, y: solesMarkY }}
								>
									S/
								</motion.span>
								<motion.span
									aria-live="polite"
									className="font-bold font-display text-[clamp(3rem,5.6vw,4.5rem)] text-foreground tabular-nums leading-none tracking-[-0.045em]"
									style={{ opacity: numberOpacity }}
								>
									{counterText}
								</motion.span>
								<motion.span
									className="font-mono text-[12px] text-foreground/60 tracking-tight"
									style={{ opacity: perMesOpacity }}
								>
									/mes
								</motion.span>
							</div>

							<motion.span
								className="mt-3 font-mono text-[10px] text-foreground/65 uppercase tracking-[0.18em]"
								style={{ opacity: nosotrosSubOpacity }}
							>
								Una suscripción · cancelas cuando quieras
							</motion.span>
						</div>
					</div>

					{/* Body paragraph — settles at the end */}
					<motion.p
						className="relative mt-10 max-w-[64ch] text-[14px] text-foreground/70 leading-[1.6] md:text-[15px]"
						style={{ opacity: bodyOpacity, y: bodyY }}
					>
						{reason.body}
					</motion.p>

					{/* Receipt footer */}
					<motion.footer
						className="relative mt-8 flex flex-wrap items-center gap-x-3 gap-y-1"
						style={{ opacity: footerOpacity }}
					>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[9.5px] text-foreground/75 uppercase tracking-[0.18em]">
							<span aria-hidden="true" className="size-1 rounded-full bg-oxblood" />
							{reason.receipt.value}
						</span>
						<span className="font-mono text-[9px] text-foreground/50 uppercase tracking-[0.16em]">
							{reason.receipt.label}
						</span>
					</motion.footer>

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
			<span className="font-mono text-[9px] text-foreground/45 uppercase tracking-[0.22em]">El argumento</span>

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
				<span className="font-medium font-mono text-[10.5px] text-foreground uppercase tracking-[0.24em]">
					Razón {reason.number} · el precio
				</span>
			</header>

			<h3 className="relative mt-5 max-w-[24ch] font-display font-semibold text-[clamp(1.75rem,3vw,2.5rem)] text-foreground leading-[1.04] tracking-[-0.028em]">
				{reason.title} <span className="font-display-italic font-light">{reason.emphasis}</span>
			</h3>

			<div className="relative mt-10 grid grid-cols-1 items-start gap-x-10 gap-y-6 md:grid-cols-[1fr_auto_1fr]">
				<div className="flex flex-col">
					<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.22em]">
						Otros · paquete suelto
					</span>
					<div className="relative mt-3 flex flex-wrap items-baseline gap-x-4">
						<span className="relative flex items-baseline gap-1 font-display font-medium text-[clamp(2.5rem,5vw,4rem)] text-foreground/45 leading-none tracking-[-0.04em]">
							<span className="font-medium text-[0.55em] text-foreground/55">S/</span>
							250
						</span>
						<span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-[2.5px] bg-foreground/70" />
					</div>
					<span className="mt-3 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.18em]">
						Paquete completo · piezas sueltas
					</span>
				</div>

				<span
					aria-hidden="true"
					className="self-center justify-self-center font-display-italic font-light text-[clamp(3rem,6vw,5.5rem)] text-foreground/30 leading-none"
				>
					vs
				</span>

				<div className="flex flex-col">
					<span className="font-mono text-[10px] text-foreground uppercase tracking-[0.22em]">
						Nosotros · ASSENDIA · todo incluido
					</span>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="font-bold font-display text-[clamp(3rem,5.6vw,4.5rem)] text-foreground leading-none tracking-[-0.045em]">
							S/
							<CountUp duration={1.0} once to={79} />
						</span>
						<span className="font-mono text-[12px] text-foreground/60 tracking-tight">/mes</span>
					</div>
					<span className="mt-3 font-mono text-[10px] text-foreground/65 uppercase tracking-[0.18em]">
						Una suscripción · cancelas cuando quieras
					</span>
				</div>
			</div>

			<p className="relative mt-10 max-w-[64ch] text-[14px] text-foreground/70 leading-[1.6] md:text-[15px]">
				{reason.body}
			</p>

			<footer className="relative mt-8 flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[9.5px] text-foreground/75 uppercase tracking-[0.18em]">
					<span aria-hidden="true" className="size-1 rounded-full bg-oxblood" />
					{reason.receipt.value}
				</span>
				<span className="font-mono text-[9px] text-foreground/50 uppercase tracking-[0.16em]">
					{reason.receipt.label}
				</span>
			</footer>
		</article>
	);
}

// =====================================================================
// SUPPORTING CELL — the three reasons (01, 03, 04) below the pinned moment.
// Compact, single-row 3-col on desktop. Each keeps its number ghost,
// body, and receipt footer with scroll-triggered entry motion.
// They are deliberately quieter than the pinned moment above.
// =====================================================================

function SupportingCell({ reason }: { reason: (typeof WHY_REASONS)[number] }) {
	const reduced = useReducedMotion() ?? false;
	const cardRef = useRef<HTMLElement>(null);
	const inView = useInView(cardRef, IN_VIEW_OPTIONS);
	const active = inView || reduced;

	const leading = splitLeadingNumber(reason.receipt.value);

	return (
		<article className={`${CARD_BASE} gap-3 p-6 md:min-h-[260px]`} ref={cardRef}>
			{/* Ghost number — scales from 0.8 to 1. Hover deepens the tint. */}
			<motion.span
				animate={active ? { scale: 1, opacity: 1 } : { scale: 0.94, opacity: 0 }}
				aria-hidden="true"
				className="pointer-events-none absolute top-[-14px] right-[-6px] origin-top-right select-none font-bold font-display text-[110px] text-foreground/[0.06] leading-none tracking-[-0.05em] transition-colors duration-500 group-hover:text-foreground/[0.12]"
				initial={reduced ? false : { scale: 0.94, opacity: 0 }}
				transition={{ duration: 0.7, ease: EASE_OUT_QUINT, delay: 0 }}
			>
				{reason.number}
			</motion.span>

			<header className="relative flex items-center gap-2">
				<span aria-hidden="true" className="size-1 rounded-full bg-oxblood" />
				<span className="font-medium font-mono text-[10px] text-foreground uppercase tracking-[0.22em]">
					Razón {reason.number}
				</span>
			</header>

			<h3 className="relative font-display font-semibold text-[1.1rem] text-foreground leading-[1.18] tracking-[-0.02em]">
				{reason.title} <span className="font-display-italic font-light">{reason.emphasis}</span>
			</h3>

			<p className="relative text-[13px] text-foreground/65 leading-[1.55]">{reason.body}</p>

			<footer className="relative mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-border border-t pt-3">
				<span className="font-mono text-[9px] text-foreground/55 uppercase tracking-[0.16em]">
					{reason.receipt.label}
				</span>
				<motion.span
					animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 6, scale: 0.96 }}
					className="font-display font-semibold text-[11px] text-foreground tracking-tight"
					initial={reduced ? false : { opacity: 0, y: 6, scale: 0.96 }}
					transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: reduced ? 0 : 0.35 }}
				>
					{leading ? (
						<>
							<CountUp duration={0.8} once to={leading.number} />
							{leading.rest}
						</>
					) : (
						reason.receipt.value
					)}
				</motion.span>
			</footer>
		</article>
	);
}

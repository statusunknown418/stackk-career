"use client";

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
import { Reveal } from "@/components/ui/reveal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { HOW_STEPS } from "./data";

/**
 * SIGNATURE SCROLL — pinned horizontal scrub through D0 → D42.
 *
 * Choreography (sectionScroll = 0 → 1, mapped to 600vh of scroll):
 *  - 0%   : Panel 01 / D0 reads flush. Track at x = 0%.
 *  - ~17% : Panel 02 / D2 lands. Counter snaps from 00 → 02.
 *  - ~34% : Panel 03 / D7  lands. Rail tick 3 ignites.
 *  - ~51% : Panel 04 / D18 lands. Halfway. Progress arc dominant.
 *  - ~68% : Panel 05 / D30 lands.
 *  - ~85% : Panel 06 / D42 lands. CTA pill scales in. "Meta" arrives.
 *  - 100% : Pin releases, vertical scroll resumes into testimonials.
 *
 * Why this and not vertical: the brief is a *journey*. Horizontal scrub
 * makes the reader physically traverse 42 days — scroll = time advancing
 * — instead of reading a list. Each panel is a destination, not a row.
 * The timeline rail at the bottom is the user's *map*; the counter is
 * their *clock*. Both are scroll-linked, not whileInView — you drive it.
 */

const STEP_DAYS: readonly number[] = [0, 2, 7, 18, 30, 42];
const STEP_INDICES: readonly string[] = ["01", "02", "03", "04", "05", "06"];
const TOTAL_DAYS = 42;

interface Phase {
	id: string;
	label: string;
	roman: string;
	stepRange: readonly [number, number];
}

const PHASES: readonly Phase[] = [
	{ id: "diagnostico", roman: "I", label: "Diagnóstico", stepRange: [0, 0] },
	{ id: "coaching", roman: "II", label: "Coaching activo", stepRange: [1, 4] },
	{ id: "resultado", roman: "III", label: "Resultado", stepRange: [5, 5] },
];

interface StepNode {
	body: string;
	day: number;
	index: string;
	phase: Phase;
	tag?: string;
	title: string;
}

const STEPS: readonly StepNode[] = HOW_STEPS.map((step, idx) => {
	const phase = PHASES.find((p) => idx >= p.stepRange[0] && idx <= p.stepRange[1]) ?? PHASES[0];
	return {
		body: step.body,
		day: STEP_DAYS[idx],
		index: STEP_INDICES[idx],
		phase,
		tag: step.tag,
		title: step.title,
	};
});

const PANEL_COUNT = STEPS.length;
// Travel: panels share viewport width 1:1, so the strip must shift by
// (PANEL_COUNT - 1) panels' worth = (N-1) * 100vw (one viewport per panel).
const TRAVEL_VW = -((PANEL_COUNT - 1) * 100);

export function HowItWorks() {
	const reduced = useReducedMotion();
	const isDesktop = useMediaQuery("md");

	if (reduced || !isDesktop) {
		return <HowItWorksStatic />;
	}
	return <HowItWorksScrub />;
}

/* -------------------------------------------------------------------------- */
/* SCRUB — desktop, motion enabled                                            */
/* -------------------------------------------------------------------------- */

function HowItWorksScrub() {
	const sectionRef = useRef<HTMLElement>(null);
	// Only mount the scroll-linked stage (the spring + ~40 scroll-driven
	// subscriptions + the panels' looping SVG graphics) while the section is near
	// the viewport. Once the user scrolls ~200px past it, the whole subtree
	// unmounts so nothing animates off-screen — the same gating idea as
	// hero-aurora-shader.tsx. The section keeps its full height, so scroll never
	// jumps when the stage mounts/unmounts.
	const inView = useInView(sectionRef, { margin: "200px 0px" });

	return (
		<section
			aria-labelledby="how-heading"
			className="relative bg-background"
			id="camino"
			ref={sectionRef}
			style={{ height: `${PANEL_COUNT * 42}vh` }}
		>
			{inView && <ScrubStage sectionRef={sectionRef} />}
		</section>
	);
}

function ScrubStage({ sectionRef }: { sectionRef: { current: HTMLElement | null } }) {
	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start start", "end end"],
	});

	// Smoothed scrub. Stiff enough to feel locked to scroll, damped enough
	// to absorb trackpad jitter. Mass low so it tracks aggressively.
	const progress = useSpring(scrollYProgress, {
		stiffness: 180,
		damping: 30,
		mass: 0.3,
	});

	// Strip translate: 0% → -(N-1)*100%. Linear — easing is on the spring.
	const stripX = useTransform(progress, [0, 1], ["0vw", `${TRAVEL_VW}vw`]);

	// Continuous day number, lerped through STEP_DAYS so it doesn't just
	// linearly count 0 → 42. Each panel "owns" a segment of scroll.
	const segmentInputs = STEPS.map((_, i) => i / (PANEL_COUNT - 1));
	const dayNumber = useTransform(progress, segmentInputs, [...STEP_DAYS]);
	const dayText = useTransform(dayNumber, (v) => `${Math.round(v).toString().padStart(2, "0")}`);

	// Active panel index for the rail and phase chip.
	const [activeIdx, setActiveIdx] = useState(0);
	// Listen to RAW scroll so the phase chip + rail tick highlights track the
	// visible panel without spring-smoothing lag.
	useMotionValueEvent(scrollYProgress, "change", (v) => {
		const idx = Math.min(PANEL_COUNT - 1, Math.max(0, Math.round(v * (PANEL_COUNT - 1))));
		setActiveIdx(idx);
	});

	// Rail fill: drawn left → right under the ticks.
	const railFill = useTransform(progress, [0, 1], ["0%", "100%"]);

	return (
		<div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden">
			<ScrubHeader activeIdx={activeIdx} dayText={dayText} progress={progress} />

			<div className="relative flex-1 overflow-hidden">
				<motion.ol
					aria-label="Como funciona ASSENDIA"
					className="flex h-full will-change-transform"
					style={{ x: stripX, width: `${PANEL_COUNT * 100}vw` }}
				>
					{STEPS.map((step, idx) => (
						<Panel idx={idx} key={step.index} progress={progress} step={step} />
					))}
				</motion.ol>
			</div>

			<ScrubRail activeIdx={activeIdx} fill={railFill} progress={progress} />
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* HEADER — fixed inside the pin. Counter + phase chip.                       */
/* -------------------------------------------------------------------------- */

interface ScrubHeaderProps {
	activeIdx: number;
	dayText: MotionValue<string>;
	progress: MotionValue<number>;
}

function ScrubHeader({ activeIdx, dayText, progress }: ScrubHeaderProps) {
	const activePhase = STEPS[activeIdx].phase;
	// Counter scales subtly with overall progress — a quiet "you're moving"
	// signal that runs the whole length, not panel-by-panel.
	const counterScale = useTransform(progress, [0, 1], [0.98, 1.02]);

	return (
		<header className="relative z-20 mx-auto flex w-full max-w-[1400px] items-end justify-between px-6 pt-10 pb-6 md:px-12 md:pt-14">
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-3 font-mono text-foreground/55 text-xs uppercase">
					<span aria-hidden="true" className="h-px w-8 bg-foreground/30" />
					<span>El camino</span>
				</div>
				<h2
					className="flex items-baseline gap-2 font-bold font-display text-foreground leading-none tracking-tighter"
					id="how-heading"
				>
					<span className="text-[clamp(2.5rem,5vw,4.25rem)]">0</span>
					<span className="font-display-italic font-light text-[clamp(2rem,4vw,3.4rem)] text-foreground/50">→</span>
					<span className="text-[clamp(2.5rem,5vw,4.25rem)]">42</span>
					<span className="mb-2 self-end font-mono text-[clamp(0.7rem,0.9vw,0.95rem)] text-foreground/50 uppercase">
						días
					</span>
				</h2>
			</div>

			<div className="hidden flex-col items-end gap-2 md:flex">
				<div className="flex items-center gap-2 font-mono text-foreground/55 text-xs uppercase">
					<span className="font-display-italic font-light text-base text-foreground/65 leading-none">
						{activePhase.roman}
					</span>
					<span aria-hidden="true" className="h-px w-4 bg-oxblood/70" />
					<span className="text-oxblood">{activePhase.label}</span>
				</div>
				<div className="flex items-baseline gap-1.5 leading-none">
					<span className="font-mono text-foreground/55 text-xs uppercase leading-none">Día</span>
					<motion.span
						aria-live="polite"
						className="font-bold font-display text-[clamp(1.75rem,3vw,2.75rem)] text-oxblood tabular-nums leading-none tracking-tighter"
						style={{ scale: counterScale }}
					>
						{dayText}
					</motion.span>
					<span className="font-mono text-foreground/35 text-xs uppercase">de {TOTAL_DAYS}</span>
				</div>
			</div>
		</header>
	);
}

/* -------------------------------------------------------------------------- */
/* PANEL — one full viewport per step. Three scroll-linked layers.            */
/* -------------------------------------------------------------------------- */

interface PanelProps {
	idx: number;
	progress: MotionValue<number>;
	step: StepNode;
}

function Panel({ idx, progress, step }: PanelProps) {
	const isLast = idx === STEPS.length - 1;
	const titleParts = isLast ? splitLastTitle(step.title) : null;

	// Each panel "owns" a slice centered on idx/(N-1). We map the global
	// progress into a local 0 → 1 ramp where 0 = panel fully off (entering),
	// 1 = panel fully landed, then it stays at 1 (or falls back to 1 on exit
	// so the leaving panel never flickers backward).
	const center = idx / (PANEL_COUNT - 1);
	const span = 1 / (PANEL_COUNT - 1);
	const local = useTransform(progress, [center - span * 0.85, center - span * 0.15, center + span * 0.6], [0, 1, 1]);

	// Three layers, staggered. Stagger via input offsets, not delays —
	// because we're scroll-linked, "delay" means "starts later in the ramp".
	const tagOpacity = useTransform(local, [0, 0.45], [0, 1]);
	const tagY = useTransform(local, [0, 0.45], [16, 0]);

	const titleOpacity = useTransform(local, [0.1, 0.7], [0, 1]);
	const titleY = useTransform(local, [0.1, 0.7], [28, 0]);

	const bodyOpacity = useTransform(local, [0.25, 0.9], [0, 1]);
	const bodyY = useTransform(local, [0.25, 0.9], [22, 0]);

	// Gauge parallaxes opposite the scroll direction so it feels weighted.
	const ghostX = useTransform(local, [0, 1], [80, -20]);

	return (
		<li aria-label={`Día ${step.day}: ${step.title}`} className="relative flex h-full w-screen shrink-0 items-center">
			{/* A distinct abstract graphic per step, matched to its copy (replaces
			    the old repeated ghost number). */}
			<StepVisual ghostX={ghostX} idx={idx} local={local} />

			<div className="relative mx-auto flex w-full max-w-7xl items-center gap-12 px-6 md:px-12">
				<div className="grid w-full grid-cols-12 items-center gap-4">
					{/* Left: index + day */}

					<div className="flex justify-center md:col-span-6">
						<motion.div
							className="flex items-baseline gap-4 font-light text-7xl tracking-tightest"
							style={{ opacity: tagOpacity, y: tagY }}
						>
							<p className="text-foreground/50">Día</p>
							<p className="font-display text-foreground tabular-nums">#{step.day}</p>
						</motion.div>
					</div>

					{/* Right: tag + title + body */}
					<div className="col-span-12 flex flex-col self-center md:col-span-6 md:col-start-7">
						{step.tag && (
							<motion.div
								className="mb-4 inline-flex w-fit items-center gap-2 text-muted-foreground text-xs uppercase"
								style={{ opacity: tagOpacity, y: tagY }}
							>
								<span aria-hidden="true" className="h-1 w-3 bg-oxblood" />
								<span>{step.tag}</span>
							</motion.div>
						)}

						<motion.h3
							className="font-display text-5xl text-foreground leading-none tracking-tight"
							style={{ opacity: titleOpacity, y: titleY }}
						>
							{titleParts ? (
								<>
									{titleParts.head} <span className="font-display-italic font-light">{titleParts.tail}</span>
								</>
							) : (
								step.title
							)}
						</motion.h3>

						<motion.p className="mt-4 text-lg text-muted-foreground" style={{ opacity: bodyOpacity, y: bodyY }}>
							{step.body}
						</motion.p>

						{isLast && (
							<motion.div
								className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-oxblood px-3.5 py-1.5 font-mono text-neutral-950 text-xs uppercase"
								style={{ opacity: bodyOpacity, y: bodyY }}
							>
								<span aria-hidden="true" className="size-1.5 rounded-full bg-background" />
								Meta · entrevista agendada
							</motion.div>
						)}
					</div>
				</div>
			</div>
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/* STEP VISUAL — a distinct abstract graphic per step, matched to its copy:    */
/* radar (diagnose) · target (map roles) · volume bars (tools produce) ·       */
/* equalizer (interview sim) · checklist (reinforce) · calendar (booked).      */
/* Abstract data-viz, never fake product UI.                                   */
/* -------------------------------------------------------------------------- */

const VOLUME_BARS = [
	{ id: "v1", h: 70 },
	{ id: "v2", h: 120 },
	{ id: "v3", h: 92 },
	{ id: "v4", h: 150 },
];
const EQ_BARS = [
	{ delay: 0, id: "e1", peak: 0.5 },
	{ delay: 0.15, id: "e2", peak: 0.85 },
	{ delay: 0.3, id: "e3", peak: 1 },
	{ delay: 0.1, id: "e4", peak: 0.65 },
	{ delay: 0.25, id: "e5", peak: 0.9 },
	{ delay: 0.05, id: "e6", peak: 0.55 },
	{ delay: 0.2, id: "e7", peak: 0.8 },
];
const CHECK_ROWS = [
	{ id: "c1", w: 150 },
	{ id: "c2", w: 110 },
	{ id: "c3", w: 132 },
];
const CAL_CELLS = Array.from({ length: 30 }, (_, i) => ({
	id: `cal-${i}`,
	marked: i === 5 || i === 12 || i === 19,
	target: i === 27,
}));

function StepVisual({ idx, local, ghostX }: { ghostX: MotionValue<number>; idx: number; local: MotionValue<number> }) {
	const reduced = useReducedMotion();
	const opacity = useTransform(local, [0.15, 0.6], [0, 1]);
	const scale = useTransform(local, [0.15, 0.8], [0.92, 1]);

	return (
		<motion.div
			aria-hidden="true"
			className="pointer-events-none absolute right-[2vw] bottom-[15vh] hidden text-oxblood md:block"
			style={reduced ? { opacity: 0.85 } : { x: ghostX, opacity, scale }}
		>
			<div className="size-[clamp(15rem,24vw,22rem)]">
				<StepGraphic idx={idx} reduced={!!reduced} />
			</div>
		</motion.div>
	);
}

function StepGraphic({ idx, reduced }: { idx: number; reduced: boolean }) {
	// 0 — Score gauge: the instant CV diagnosis (a 0→100 dial)
	if (idx === 0) {
		return (
			<svg aria-hidden="true" className="size-full" fill="none" role="presentation" viewBox="0 0 240 240">
				{/* Dial track — the 0 → 100 score range */}
				<path
					d="M 28 150 A 92 92 0 0 1 212 150"
					stroke="currentColor"
					strokeLinecap="round"
					strokeOpacity={0.18}
					strokeWidth="3"
				/>
				{/* Score fill — where the diagnosis lands on the dial */}
				<path
					d="M 28 150 A 92 92 0 0 1 190 91"
					stroke="currentColor"
					strokeLinecap="round"
					strokeOpacity={0.7}
					strokeWidth="5"
				/>
				{/* Major ticks around the dial */}
				<g stroke="currentColor" strokeLinecap="round" strokeOpacity={0.3} strokeWidth="2">
					<line x1="28" x2="44" y1="150" y2="150" />
					<line x1="55" x2="66" y1="85" y2="96" />
					<line x1="120" x2="120" y1="58" y2="74" />
					<line x1="185" x2="174" y1="85" y2="96" />
					<line x1="212" x2="196" y1="150" y2="150" />
				</g>
				{/* Needle — settles on the score with a subtle live sweep */}
				<motion.g
					animate={reduced ? undefined : { rotate: [-5, 5, -5] }}
					style={{ transformOrigin: "120px 150px" }}
					transition={reduced ? undefined : { duration: 4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
				>
					<line
						stroke="currentColor"
						strokeLinecap="round"
						strokeOpacity={0.9}
						strokeWidth="4"
						x1="120"
						x2="180"
						y1="150"
						y2="100"
					/>
				</motion.g>
				{/* Score marker on the dial */}
				<circle cx="190" cy="91" fill="currentColor" r="5" />
				{/* Hub */}
				<circle cx="120" cy="150" fill="currentColor" r="9" />
				<circle cx="120" cy="150" fill="var(--paper)" r="3.5" />
			</svg>
		);
	}
	// 1 — Target: realistic roles + target companies converging on the bullseye
	if (idx === 1) {
		return (
			<svg aria-hidden="true" className="size-full" fill="none" role="presentation" viewBox="0 0 240 240">
				{[110, 76, 44].map((r, i) => (
					<circle
						cx="120"
						cy="120"
						key={`t-${r}`}
						r={r}
						stroke="currentColor"
						strokeOpacity={0.14 + i * 0.12}
						strokeWidth="1.5"
					/>
				))}
				<line stroke="currentColor" strokeOpacity={0.2} x1="120" x2="120" y1="8" y2="232" />
				<line stroke="currentColor" strokeOpacity={0.2} x1="8" x2="232" y1="120" y2="120" />
				<circle cx="120" cy="120" fill="currentColor" r="11" />
				<circle cx="120" cy="120" fill="var(--paper)" r="4" />
				<circle cx="168" cy="72" fill="currentColor" fillOpacity={0.6} r="4" />
				<circle cx="74" cy="158" fill="currentColor" fillOpacity={0.4} r="3" />
			</svg>
		);
	}
	// 2 — Volume bars: the AI producing output against every offer
	if (idx === 2) {
		return (
			<svg aria-hidden="true" className="size-full" fill="none" role="presentation" viewBox="0 0 240 240">
				<line stroke="currentColor" strokeOpacity={0.2} x1="30" x2="210" y1="200" y2="200" />
				{VOLUME_BARS.map((b, i) => (
					<motion.rect
						animate={reduced ? undefined : { scaleY: [0, 1] }}
						fill="currentColor"
						fillOpacity={0.35 + i * 0.18}
						height={b.h}
						initial={reduced ? undefined : { scaleY: 0 }}
						key={b.id}
						rx="6"
						style={{ transformOrigin: `${57 + i * 44}px 200px` }}
						transition={
							reduced
								? undefined
								: {
										duration: 1.1,
										ease: [0.22, 1, 0.36, 1],
										delay: i * 0.16,
										repeat: Number.POSITIVE_INFINITY,
										repeatType: "reverse",
										repeatDelay: 0.9,
									}
						}
						width="30"
						x={42 + i * 44}
						y={200 - b.h}
					/>
				))}
			</svg>
		);
	}
	// 3 — Equalizer: the 1:1 interview simulation (live voice)
	if (idx === 3) {
		return (
			<svg aria-hidden="true" className="size-full" fill="none" role="presentation" viewBox="0 0 240 240">
				{EQ_BARS.map((b, i) => (
					<motion.rect
						animate={reduced ? undefined : { scaleY: [0.35, b.peak, 0.35] }}
						fill="currentColor"
						fillOpacity={0.5 + (b.peak - 0.5) * 0.6}
						height="150"
						key={b.id}
						rx="5"
						style={{ transformOrigin: "center 120px" }}
						transition={
							reduced
								? undefined
								: { duration: 1.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, delay: b.delay }
						}
						width="14"
						x={26 + i * 28}
						y="45"
					/>
				))}
			</svg>
		);
	}
	// 4 — Checklist: reviewing what went well, what to polish
	if (idx === 4) {
		return (
			<svg aria-hidden="true" className="size-full" fill="none" role="presentation" viewBox="0 0 240 240">
				{CHECK_ROWS.map((row, i) => (
					<g key={row.id} transform={`translate(40 ${72 + i * 44})`}>
						<circle cx="12" cy="12" fill="currentColor" fillOpacity={0.18} r="14" />
						<path
							d="M5 12 L10 17 L19 7"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2.5"
						/>
						<rect fill="currentColor" fillOpacity={0.22} height="5" rx="2.5" width={row.w} x="42" y="9" />
					</g>
				))}
			</svg>
		);
	}
	// 5 — Calendar: real interviews booked on the agenda
	return (
		<svg aria-hidden="true" className="size-full" fill="none" role="presentation" viewBox="0 0 240 240">
			<rect
				height="160"
				rx="14"
				stroke="currentColor"
				strokeOpacity={0.25}
				strokeWidth="1.5"
				width="180"
				x="30"
				y="44"
			/>
			<line stroke="currentColor" strokeOpacity={0.25} x1="30" x2="210" y1="74" y2="74" />
			<circle cx="48" cy="59" fill="currentColor" r="3" />
			<circle cx="62" cy="59" fill="currentColor" fillOpacity={0.5} r="3" />
			{CAL_CELLS.map((c, i) => {
				const col = i % 6;
				const rowi = Math.floor(i / 6);
				const cx = 52 + col * 28;
				const cy = 96 + rowi * 22;
				if (c.target) {
					return <circle cx={cx} cy={cy} fill="currentColor" key={c.id} r="7" />;
				}
				return (
					<circle
						cx={cx}
						cy={cy}
						fill="currentColor"
						fillOpacity={c.marked ? 0.55 : 0.14}
						key={c.id}
						r={c.marked ? 5 : 3.5}
					/>
				);
			})}
		</svg>
	);
}

/* -------------------------------------------------------------------------- */
/* RAIL — bottom timeline. Ticks + filled bar + sliding dot.                  */
/* -------------------------------------------------------------------------- */

interface ScrubRailProps {
	activeIdx: number;
	fill: MotionValue<string>;
	progress: MotionValue<number>;
}

function ScrubRail({ activeIdx, fill, progress }: ScrubRailProps) {
	const dotX = useTransform(progress, [0, 1], ["0%", "100%"]);

	return (
		<div className="relative z-20 mx-auto w-full max-w-[1400px] px-6 pb-10 md:px-12 md:pb-14">
			<div className="mb-3 flex items-center justify-between font-mono text-foreground/55 text-xs uppercase">
				<span>Promedio plan Premium</span>
				<span className="hidden tabular-nums md:inline">
					Días · {STEP_INDICES[activeIdx]} de 0{PANEL_COUNT}
				</span>
			</div>

			<div className="relative">
				{/* Base hairline */}
				<div className="h-px w-full bg-foreground/12" />

				{/* Filled progress — scroll-linked width */}
				<motion.div aria-hidden="true" className="absolute inset-y-0 left-0 h-px bg-oxblood" style={{ width: fill }} />

				{/* Riding dot */}
				<motion.div
					aria-hidden="true"
					className="absolute -top-[5px] left-0 flex items-center justify-center"
					style={{ x: dotX }}
				>
					<span className="block size-[11px] -translate-x-1/2 rounded-full bg-oxblood shadow-[0_0_0_4px_var(--background)]" />
				</motion.div>

				{/* Tick stops */}
				<ol className="relative mt-4 grid grid-cols-6 gap-0">
					{STEPS.map((step, idx) => {
						const active = idx <= activeIdx;
						return (
							<li
								className="relative flex flex-col items-start"
								key={step.index}
								style={{ alignItems: idx === PANEL_COUNT - 1 ? "flex-end" : "flex-start" }}
							>
								{/* Connector node sitting on the rail line — lights up green once passed */}
								<span
									aria-hidden="true"
									className={`absolute -top-[1.45rem] size-2.5 rounded-full border-2 transition-colors duration-300 ${
										active ? "border-oxblood bg-oxblood" : "border-foreground/30 bg-background"
									}`}
									style={{
										left: idx === PANEL_COUNT - 1 ? "auto" : "-1px",
										right: idx === PANEL_COUNT - 1 ? "-1px" : "auto",
									}}
								/>
								<span
									className={`font-mono text-xs uppercase tabular-nums transition-colors duration-300 ${
										active ? "text-foreground" : "text-foreground/35"
									}`}
								>
									{step.day}
								</span>
								<span
									aria-hidden="true"
									className={`mt-1 font-mono text-xs uppercase transition-colors duration-300 ${
										active ? "text-oxblood" : "text-foreground/25"
									}`}
								>
									{step.phase.label}
								</span>
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* STATIC fallback — reduced motion + mobile. Same data, no scrub.            */
/* -------------------------------------------------------------------------- */

function HowItWorksStatic() {
	return (
		<section aria-labelledby="how-heading-static" className="relative bg-background px-6 py-20 md:py-28" id="camino">
			<Reveal>
				<header className="mx-auto mb-12 max-w-7xl">
					<div className="mb-6 flex items-center gap-3 font-mono text-foreground/55 text-xs uppercase">
						<span aria-hidden="true" className="h-px w-8 bg-foreground/30" />
						<span>El camino</span>
					</div>
					<h2
						className="flex flex-wrap items-baseline gap-x-2 gap-y-2 font-bold font-display text-[clamp(3rem,10vw,7rem)] text-foreground leading-[0.9] tracking-tighter"
						id="how-heading-static"
					>
						<span className="tabular-nums">0</span>
						<span className="font-display-italic font-light text-[0.85em] text-foreground/50 leading-none">→</span>
						<span className="tabular-nums">42</span>
						<span className="self-end pb-2 font-mono text-[clamp(0.7rem,1.4vw,1rem)] text-foreground/50 uppercase">
							días
						</span>
					</h2>
					<p className="mt-5 max-w-100 text-foreground/65 leading-relaxed">
						El camino, día por día. Tiempos medidos sobre los procesos reales de nuestros primeros usuarios.
					</p>
				</header>
			</Reveal>

			<ol className="mx-auto flex max-w-7xl flex-col">
				{STEPS.map((step, idx) => {
					const isLast = idx === STEPS.length - 1;
					const isFirstOfPhase = idx === step.phase.stepRange[0];
					const titleParts = isLast ? splitLastTitle(step.title) : null;
					return (
						<li className="relative border-foreground/10 border-t py-10 first:border-t-0 first:pt-0" key={step.index}>
							{isFirstOfPhase && (
								<div className="mb-4 flex items-center gap-2 font-mono text-oxblood text-xs uppercase">
									<span className="font-display-italic font-light text-base text-foreground/65 leading-none">
										{step.phase.roman}
									</span>
									<span aria-hidden="true" className="h-px w-4 bg-oxblood/60" />
									<span>{step.phase.label}</span>
								</div>
							)}
							<div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-8">
								<div className="flex items-center justify-between gap-3 md:w-[180px] md:shrink-0 md:items-baseline md:justify-start">
									<div className="flex items-baseline gap-2">
										<span className="font-mono text-foreground/40 text-xs uppercase tabular-nums">{step.index}</span>
										<span className="flex items-baseline gap-1.5">
											<span className="font-mono text-foreground/40 text-xs uppercase">Día</span>
											<span className="font-bold font-display text-[clamp(2.5rem,7vw,5rem)] text-foreground tabular-nums leading-none tracking-tighter">
												{step.day}
											</span>
										</span>
									</div>
									<div aria-hidden="true" className="size-[clamp(3rem,13vw,4.5rem)] shrink-0 text-oxblood md:hidden">
										<StepGraphic idx={idx} reduced />
									</div>
								</div>
								<div className="flex max-w-[52ch] flex-1 flex-col">
									{step.tag && <span className="mb-2 font-mono text-foreground/55 text-xs uppercase">{step.tag}</span>}
									<h3 className="font-bold font-display text-[clamp(1.4rem,3vw,2rem)] text-foreground leading-[1.1] tracking-tight">
										{titleParts ? (
											<>
												{titleParts.head}{" "}
												<span className="font-display-italic font-light text-foreground/70">{titleParts.tail}</span>
											</>
										) : (
											step.title
										)}
									</h3>
									<p className="mt-3 text-base text-foreground/70 leading-relaxed">{step.body}</p>
									{isLast && (
										<div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-oxblood px-3 py-1 font-mono text-neutral-950 text-xs uppercase">
											<span aria-hidden="true" className="size-1.5 rounded-full bg-background" />
											Meta
										</div>
									)}
								</div>
								<div aria-hidden="true" className="hidden shrink-0 self-center text-oxblood md:block">
									<div className="size-[clamp(5.5rem,11vw,8rem)]">
										<StepGraphic idx={idx} reduced />
									</div>
								</div>
							</div>
						</li>
					);
				})}
			</ol>

			<div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-foreground/8 border-t pt-6 font-mono text-foreground/55 text-xs uppercase sm:flex-row sm:items-center sm:justify-between">
				<span>Sobre 240+ procesos reales</span>
				<span className="flex items-center gap-2 text-foreground/70">
					<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
					Día 42 · entrevistas reales
				</span>
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* utils                                                                      */
/* -------------------------------------------------------------------------- */

function splitLastTitle(title: string): { head: string; tail: string } {
	const parts = title.split(" ");
	if (parts.length <= 2) {
		return { head: title, tail: "" };
	}
	const tailWords = parts.slice(-2).join(" ");
	const headWords = parts.slice(0, -2).join(" ");
	return { head: headWords, tail: tailWords };
}

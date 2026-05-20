"use client";

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
import { Reveal } from "@/components/ui/reveal";
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
	const isDesktop = useIsDesktop();

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
		<section
			aria-labelledby="how-heading"
			className="relative bg-background"
			id="camino"
			ref={sectionRef}
			style={{ height: `${PANEL_COUNT * 50}vh` }}
		>
			<div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden">
				<ScrubHeader activeIdx={activeIdx} dayText={dayText} progress={progress} />

				<div className="relative flex-1 overflow-hidden">
					<motion.ol
						aria-label="Pasos del camino ASSENDIA"
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
		</section>
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
				<div className="flex items-center gap-3 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.24em]">
					<span aria-hidden="true" className="h-px w-8 bg-foreground/30" />
					<span>El camino</span>
				</div>
				<h2
					className="flex items-baseline gap-3 font-bold font-display text-foreground leading-none tracking-[-0.045em]"
					id="how-heading"
				>
					<span className="text-[clamp(2.5rem,5vw,4.25rem)]">D0</span>
					<span className="font-display-italic font-light text-[0.45em] text-foreground/50">a</span>
					<span className="text-[clamp(2.5rem,5vw,4.25rem)]">D42</span>
				</h2>
			</div>

			<div className="hidden flex-col items-end gap-2 md:flex">
				<div className="flex items-center gap-2 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.22em]">
					<span className="font-display-italic font-light text-base text-foreground/65 leading-none">
						{activePhase.roman}
					</span>
					<span aria-hidden="true" className="h-px w-4 bg-oxblood/70" />
					<span className="text-oxblood">{activePhase.label}</span>
				</div>
				<div className="flex items-baseline gap-1.5 leading-none">
					<span className="font-mono text-[12px] text-foreground/40 leading-none">D</span>
					<motion.span
						aria-live="polite"
						className="font-bold font-display text-[clamp(3.5rem,7vw,6rem)] text-oxblood tabular-nums leading-none tracking-[-0.05em]"
						style={{ scale: counterScale }}
					>
						{dayText}
					</motion.span>
					<span className="ml-1 font-mono text-[11px] text-foreground/35 uppercase tracking-[0.18em]">
						/ {TOTAL_DAYS}
					</span>
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

	// The huge ghost day number behind the content — parallaxes opposite the
	// scroll direction so it feels weighted, like a fixed landmark you pass.
	const ghostX = useTransform(local, [0, 1], [80, -40]);
	const ghostOpacity = useTransform(local, [0, 0.5, 1], [0, 0.06, 0.08]);

	// Index pill — barely scales in, never bounces.
	const pillScale = useTransform(local, [0, 0.6], [0.96, 1]);
	const pillOpacity = useTransform(local, [0, 0.4], [0, 1]);

	return (
		<li aria-label={`Día ${step.day}: ${step.title}`} className="relative flex h-full w-screen shrink-0 items-center">
			{/* Ghost background day — anchors the panel to its number */}
			<motion.span
				aria-hidden="true"
				className="pointer-events-none absolute right-[-2vw] bottom-[8vh] select-none font-bold font-display text-foreground tabular-nums leading-[0.8] tracking-[-0.07em]"
				style={{
					fontSize: "clamp(20rem, 42vw, 44rem)",
					opacity: ghostOpacity,
					x: ghostX,
				}}
			>
				{step.day}
			</motion.span>

			<div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center gap-12 px-6 md:px-12">
				<div className="grid w-full grid-cols-12 items-end gap-8">
					{/* Left: index + day */}
					<div className="col-span-12 flex flex-col gap-6 md:col-span-5">
						<motion.div
							className="inline-flex w-fit items-center gap-2 rounded-full border border-foreground/15 px-3 py-1.5 font-mono text-[10px] text-foreground/65 uppercase tracking-[0.22em] backdrop-blur-sm"
							style={{ opacity: pillOpacity, scale: pillScale }}
						>
							<span aria-hidden="true" className="size-1 rounded-full bg-oxblood" />
							<span className="text-foreground tabular-nums">{step.index}</span>
							<span className="text-foreground/30">/ 0{PANEL_COUNT}</span>
						</motion.div>

						<motion.div className="flex items-baseline gap-2" style={{ opacity: tagOpacity, y: tagY }}>
							<span className="font-mono text-[11px] text-foreground/50 uppercase tracking-[0.22em]">Día</span>
							<span className="font-bold font-display text-[clamp(6rem,14vw,12rem)] text-foreground tabular-nums leading-[0.82] tracking-[-0.065em]">
								{step.day}
							</span>
						</motion.div>
					</div>

					{/* Right: tag + title + body */}
					<div className="col-span-12 flex max-w-[44ch] flex-col md:col-span-7 md:col-start-7">
						{step.tag && (
							<motion.div
								className="mb-5 inline-flex w-fit items-center gap-2 font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]"
								style={{ opacity: tagOpacity, y: tagY }}
							>
								<span aria-hidden="true" className="h-px w-6 bg-oxblood" />
								<span>{step.tag}</span>
							</motion.div>
						)}

						<motion.h3
							className="font-bold font-display text-[clamp(2rem,3.6vw,3.25rem)] text-foreground leading-[1.02] tracking-[-0.03em]"
							style={{ opacity: titleOpacity, y: titleY }}
						>
							{titleParts ? (
								<>
									{titleParts.head}{" "}
									<span className="font-display-italic font-light text-foreground/70">{titleParts.tail}</span>
								</>
							) : (
								step.title
							)}
						</motion.h3>

						<motion.p
							className="mt-5 text-[clamp(1rem,1.15vw,1.125rem)] text-foreground/70 leading-[1.6]"
							style={{ opacity: bodyOpacity, y: bodyY }}
						>
							{step.body}
						</motion.p>

						{isLast && (
							<motion.div
								className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-oxblood px-3.5 py-1.5 font-mono text-[10px] text-background uppercase tracking-[0.18em]"
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
			<div className="mb-3 flex items-center justify-between font-mono text-[10px] text-foreground/45 uppercase tracking-[0.22em]">
				<span>Promedio Premium · sobre 2.400+ procesos</span>
				<span className="hidden tabular-nums md:inline">
					{STEP_INDICES[activeIdx]} / 0{PANEL_COUNT}
				</span>
			</div>

			<div className="relative">
				{/* Base hairline */}
				<div className="h-px w-full bg-foreground/[0.12]" />

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
								<span
									className={`font-mono text-[11px] uppercase tabular-nums tracking-[0.22em] transition-colors duration-300 ${
										active ? "text-foreground" : "text-foreground/35"
									}`}
								>
									D{step.day}
								</span>
								<span
									aria-hidden="true"
									className={`mt-1 font-mono text-[9px] uppercase tracking-[0.18em] transition-colors duration-300 ${
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
				<header className="mx-auto mb-12 max-w-[1200px]">
					<div className="mb-6 flex items-center gap-3 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.24em]">
						<span aria-hidden="true" className="h-px w-8 bg-foreground/30" />
						<span>El camino</span>
					</div>
					<h2
						className="flex flex-wrap items-baseline gap-x-4 gap-y-2 font-bold font-display text-[clamp(3rem,10vw,7rem)] text-foreground leading-[0.9] tracking-[-0.05em]"
						id="how-heading-static"
					>
						<span className="tabular-nums">D0</span>
						<span className="font-display-italic font-light text-[0.45em] text-foreground/50 leading-none">a</span>
						<span className="tabular-nums">D42</span>
					</h2>
					<p className="mt-5 max-w-[520px] text-foreground/65 leading-[1.55]">
						El camino, día por día. Tiempos medidos sobre los más de 2.400 procesos del último año.
					</p>
				</header>
			</Reveal>

			<ol className="mx-auto flex max-w-[1200px] flex-col">
				{STEPS.map((step, idx) => {
					const isLast = idx === STEPS.length - 1;
					const isFirstOfPhase = idx === step.phase.stepRange[0];
					const titleParts = isLast ? splitLastTitle(step.title) : null;
					return (
						<li
							className="relative border-foreground/[0.1] border-t py-10 first:border-t-0 first:pt-0"
							key={step.index}
						>
							{isFirstOfPhase && (
								<div className="mb-4 flex items-center gap-2 font-mono text-[10px] text-oxblood uppercase tracking-[0.24em]">
									<span className="font-display-italic font-light text-base text-foreground/65 leading-none">
										{step.phase.roman}
									</span>
									<span aria-hidden="true" className="h-px w-4 bg-oxblood/60" />
									<span>{step.phase.label}</span>
								</div>
							)}
							<div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-8">
								<div className="flex items-baseline gap-3 md:w-[180px] md:shrink-0">
									<span className="font-mono text-[11px] text-foreground/40 uppercase tabular-nums tracking-[0.22em]">
										{step.index}
									</span>
									<span className="font-bold font-display text-[clamp(2.5rem,7vw,5rem)] text-foreground tabular-nums leading-none tracking-[-0.05em]">
										<span className="text-foreground/30">D</span>
										{step.day}
									</span>
								</div>
								<div className="flex max-w-[52ch] flex-1 flex-col">
									{step.tag && (
										<span className="mb-2 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.22em]">
											{step.tag}
										</span>
									)}
									<h3 className="font-bold font-display text-[clamp(1.4rem,3vw,2rem)] text-foreground leading-[1.1] tracking-[-0.025em]">
										{titleParts ? (
											<>
												{titleParts.head}{" "}
												<span className="font-display-italic font-light text-foreground/70">{titleParts.tail}</span>
											</>
										) : (
											step.title
										)}
									</h3>
									<p className="mt-3 text-[15px] text-foreground/70 leading-[1.6]">{step.body}</p>
									{isLast && (
										<div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-oxblood px-3 py-1 font-mono text-[10px] text-background uppercase tracking-[0.18em]">
											<span aria-hidden="true" className="size-1.5 rounded-full bg-background" />
											Meta
										</div>
									)}
								</div>
							</div>
						</li>
					);
				})}
			</ol>

			<div className="mx-auto mt-10 flex max-w-[1200px] items-center justify-between border-foreground/[0.08] border-t pt-6 font-mono text-[10px] text-foreground/55 uppercase tracking-[0.22em]">
				<span>Sobre 2.400+ procesos · últimos 12 meses</span>
				<span className="flex items-center gap-2 text-foreground/70">
					<span aria-hidden="true" className="size-1.5 rounded-full bg-oxblood" />
					D42 · entrevistas reales
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

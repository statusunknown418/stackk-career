"use client";

import {
	CheckIcon,
	ConfettiIcon,
	HandshakeIcon,
	LightningIcon,
	MicrophoneIcon,
	TargetIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { type ReactNode, useRef } from "react";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { HOW_STEPS } from "./data";

const STEP_ICONS: readonly ReactNode[] = [
	<UploadSimpleIcon key="upload" size={18} weight="duotone" />,
	<TargetIcon key="target" size={18} weight="duotone" />,
	<LightningIcon key="lightning" size={18} weight="duotone" />,
	<MicrophoneIcon key="microphone" size={18} weight="duotone" />,
	<HandshakeIcon key="handshake" size={18} weight="duotone" />,
	<ConfettiIcon key="confetti" size={18} weight="duotone" />,
];

const STEP_DAYS: readonly number[] = [0, 2, 7, 18, 30, 42];

function getStepAccent(idx: number, total: number): { node: string; badge: string } {
	if (idx === total - 1) {
		return {
			node: "bg-marigold text-background shadow-[0_0_24px_-4px_oklch(from_var(--marigold)_l_c_h/0.55)]",
			badge: "border-marigold/40 bg-marigold/10 text-foreground",
		};
	}
	if (idx === 0) {
		return {
			node: "bg-card text-foreground/70 border border-foreground/15",
			badge: "border-foreground/15 bg-foreground/5 text-foreground/65",
		};
	}
	return {
		node: "bg-oxblood text-background",
		badge: "border-oxblood/25 bg-oxblood/8 text-oxblood",
	};
}

export function HowItWorks() {
	const reduced = useReducedMotion();
	const timelineRef = useRef<HTMLOListElement>(null);
	const { scrollYProgress } = useScroll({
		target: timelineRef,
		offset: ["start 0.85", "end 0.4"],
	});
	const smoothProgress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.5 });
	const fillScaleY = useTransform(smoothProgress, [0, 1], reduced ? [1, 1] : [0, 1]);

	return (
		<section className="px-6 py-16 md:py-24" id="camino">
			<Reveal>
				<header className="mx-auto mb-14 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/70 uppercase tracking-[0.18em]">Cómo funciona</span>
					<h2 className="mt-3 max-w-[820px] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
						<WordReveal>El camino. De Día 0 a entrevista conseguida.</WordReveal>
					</h2>
					<p className="mt-5 max-w-[580px] text-[1rem] text-foreground/65 leading-[1.55]">
						6 pasos. La IA hace el volumen. El coach hace que cada uno cuente.
					</p>
				</header>
			</Reveal>

			<ol className="relative mx-auto max-w-[820px]" ref={timelineRef}>
				<div aria-hidden="true" className="absolute top-4 bottom-4 left-[19px] w-px bg-foreground/10 md:left-[27px]" />
				<motion.div
					aria-hidden="true"
					className="absolute top-4 bottom-4 left-[19px] w-px origin-top bg-gradient-to-b from-oxblood via-oxblood to-marigold md:left-[27px]"
					style={{ scaleY: fillScaleY }}
				/>

				{HOW_STEPS.map((step, idx) => {
					const accent = getStepAccent(idx, HOW_STEPS.length);
					return (
						<motion.li
							className="relative grid grid-cols-[40px_1fr] items-start gap-5 pb-12 last:pb-0 md:grid-cols-[56px_1fr] md:gap-7"
							initial={reduced ? false : { opacity: 0, y: 28, filter: "blur(10px)" }}
							key={step.title}
							transition={reduced ? { duration: 0 } : { duration: 0.75, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
							viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
							whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
						>
							<div className="relative flex flex-col items-center">
								<div className={`relative z-10 grid size-10 place-items-center rounded-full md:size-14 ${accent.node}`}>
									{STEP_ICONS[idx]}
								</div>
								<span className="mt-2 whitespace-nowrap font-medium font-mono text-[10px] text-foreground/70 tracking-[0.14em]">
									Día {STEP_DAYS[idx]}
								</span>
							</div>

							<div className="pt-2">
								<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
									<h3 className="font-display font-semibold text-[1.25rem] text-foreground leading-[1.2] tracking-[-0.02em] md:text-[1.4rem]">
										{step.title}
									</h3>
									{step.tag && (
										<span
											className={`shrink-0 rounded-full border px-2.5 py-0.5 font-medium font-mono text-[10px] uppercase tracking-[0.12em] ${accent.badge}`}
										>
											{step.tag}
										</span>
									)}
								</div>
								<p className="mt-2 max-w-[58ch] text-[15px] text-foreground/65 leading-[1.55]">{step.body}</p>
								<StepVisual idx={idx} />
							</div>
						</motion.li>
					);
				})}
			</ol>
		</section>
	);
}

function StepVisual({ idx }: { idx: number }) {
	if (idx === 0) {
		return <ScoreBarVisual />;
	}
	if (idx === 1) {
		return <RoleChipsVisual />;
	}
	if (idx === 2) {
		return <ToolsProgressVisual />;
	}
	if (idx === 3) {
		return <RubricVisual />;
	}
	if (idx === 4) {
		return null;
	}
	return <OfferReceiptVisual />;
}

function ScoreBarVisual() {
	return (
		<div className="mt-4 flex max-w-[440px] items-center gap-3 rounded-md border border-foreground/8 bg-card/60 px-3 py-2">
			<span className="font-medium font-mono text-[9px] text-foreground/70 uppercase tracking-[0.14em]">Score CV</span>
			<span className="font-display text-[13px] text-foreground/40 tabular-nums">47</span>
			<span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/8">
				<span className="absolute inset-y-0 left-0 w-[95%] rounded-full bg-oxblood motion-safe:animate-[score-fill_1.4s_cubic-bezier(.2,.7,.2,1)_0.2s_both]" />
			</span>
			<span className="font-display font-semibold text-[13px] text-oxblood tabular-nums">95</span>
		</div>
	);
}

const ROLE_CHIPS: ReadonlyArray<{ accent: boolean; label: string }> = [
	{ label: "PM Senior · Yape", accent: true },
	{ label: "Growth · Rappi", accent: false },
	{ label: "Lead BizOps · BCP", accent: false },
];

function RoleChipsVisual() {
	return (
		<div className="mt-4 flex max-w-[440px] flex-wrap items-center gap-1.5">
			{ROLE_CHIPS.map((chip) => (
				<span
					className={
						chip.accent
							? "rounded-sm border border-oxblood/30 bg-oxblood/8 px-2 py-1 font-display font-medium text-[11px] text-oxblood"
							: "rounded-sm border border-foreground/12 bg-card/60 px-2 py-1 font-display text-[11px] text-foreground/70"
					}
					key={chip.label}
				>
					{chip.label}
				</span>
			))}
		</div>
	);
}

const TOOL_BARS: ReadonlyArray<{ label: string; pct: number }> = [
	{ label: "CV", pct: 88 },
	{ label: "Carta", pct: 62 },
	{ label: "LinkedIn", pct: 91 },
	{ label: "Mensajes", pct: 45 },
];

function ToolsProgressVisual() {
	return (
		<div className="mt-4 grid max-w-[440px] grid-cols-4 gap-2.5">
			{TOOL_BARS.map((bar) => (
				<div className="flex flex-col gap-1.5" key={bar.label}>
					<span className="font-mono text-[9px] text-foreground/70 uppercase tracking-[0.1em]">{bar.label}</span>
					<span className="relative h-1 overflow-hidden rounded-full bg-foreground/8">
						<span className="absolute inset-y-0 left-0 rounded-full bg-oxblood" style={{ width: `${bar.pct}%` }} />
					</span>
				</div>
			))}
		</div>
	);
}

const RUBRIC_ITEMS: readonly string[] = ["Método STAR", "Lenguaje corporal", "Confianza"];

function RubricVisual() {
	return (
		<div className="mt-4 flex max-w-[440px] flex-wrap items-center gap-x-4 gap-y-1.5">
			{RUBRIC_ITEMS.map((item) => (
				<span className="flex items-center gap-1.5 text-[12px] text-foreground/75" key={item}>
					<span aria-hidden="true" className="grid size-3.5 place-items-center rounded-full bg-oxblood/15 text-oxblood">
						<CheckIcon size={9} weight="bold" />
					</span>
					{item}
				</span>
			))}
		</div>
	);
}

function OfferReceiptVisual() {
	return (
		<div className="mt-4 inline-flex max-w-full items-center gap-2.5 rounded-md border border-marigold/35 bg-marigold/10 px-3 py-2">
			<span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-marigold text-background">
				<CheckIcon size={11} weight="bold" />
			</span>
			<span className="font-display font-medium text-[13px] text-foreground">Día 42 · Entrevistas reales</span>
			<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.14em]">Premium</span>
		</div>
	);
}

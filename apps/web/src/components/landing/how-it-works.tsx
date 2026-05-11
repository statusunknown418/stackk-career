"use client";

import {
	ConfettiIcon,
	HandshakeIcon,
	LightningIcon,
	MicrophoneIcon,
	TargetIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
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

function getStepAccent(idx: number, total: number): { node: string; badge: string } {
	if (idx === total - 1) {
		return {
			node: "bg-gradient-to-br from-marigold to-orange-500 text-background shadow-[0_0_24px_-4px_oklch(from_var(--marigold)_l_c_h/0.55)]",
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
		node: "bg-gradient-to-br from-oxblood to-aurora-3 text-background",
		badge: "border-oxblood/25 bg-oxblood/8 text-oxblood",
	};
}

export function HowItWorks() {
	const reduced = useReducedMotion();
	return (
		<section className="px-6 py-32" id="camino">
			<Reveal>
				<header className="mx-auto mb-20 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/55 uppercase tracking-[0.18em]">— Cómo funciona</span>
					<h2 className="mt-4 max-w-[900px] font-bold font-display text-[clamp(2.4rem,5.6vw,4.5rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
						<WordReveal>De CV ignorado a oferta firmada.</WordReveal>
					</h2>
					<p className="mt-6 max-w-[620px] text-[1.05rem] text-foreground/65 leading-[1.55]">
						6 pasos. La IA hace el trabajo de fondo. El coach hace que cada uno cuente.
					</p>
				</header>
			</Reveal>

			<ol className="relative mx-auto max-w-[820px]">
				<div
					aria-hidden="true"
					className="absolute top-4 bottom-4 left-[19px] w-px bg-gradient-to-b from-foreground/8 via-oxblood/25 to-marigold/40 md:left-[27px]"
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
								<span className="mt-2 font-medium font-mono text-[10px] text-foreground/45 tracking-[0.14em]">
									{String(idx + 1).padStart(2, "0")}
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
							</div>
						</motion.li>
					);
				})}
			</ol>
		</section>
	);
}

"use client";

import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { FAQ_ITEMS } from "./data";

const VISIBLE_FAQ_COUNT = 6;
const EASE_OUT_QUINT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Faq() {
	const sectionRef = useRef<HTMLElement>(null);
	const [showAll, setShowAll] = useState(false);
	const [openValue, setOpenValue] = useState<string | null>(null);
	const reduced = useReducedMotion();

	const hasExtras = FAQ_ITEMS.length > VISIBLE_FAQ_COUNT;
	const items = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, VISIBLE_FAQ_COUNT);

	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start end", "end start"],
	});

	// Subtle scroll-driven life on the left column. Title eases in then holds.
	// Title settles in with a subtle drop, then holds — no dead scale animation.
	const smoothScroll = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.3 });
	const titleY = useTransform(smoothScroll, [0, 0.3], [22, 0]);
	const introOpacity = useTransform(smoothScroll, [0.05, 0.32], [0, 1]);
	// Green territory rail. Draws as the section enters, holds, releases at the end.
	const railScaleY = useTransform(smoothScroll, [0.05, 0.55], [0, 1]);

	return (
		<section
			className="relative border-border border-y bg-foreground/[0.025] px-6 py-20 md:py-28"
			id="faq"
			ref={sectionRef}
		>
			<div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-12 md:gap-16">
				{/* LEFT — sticky scroll-driven header */}
				<div className="md:col-span-5">
					<div className="md:sticky md:top-28">
						<motion.div
							className="flex items-center gap-2.5"
							initial={reduced ? false : { opacity: 0, y: 12 }}
							transition={{ duration: 0.6, ease: EASE_OUT_QUINT }}
							viewport={{ once: false, margin: "-20% 0px" }}
							whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
						>
							<span aria-hidden="true" className="relative grid size-2 place-items-center">
								<span className="absolute inset-0 animate-[live-pulse_2.4s_ease-in-out_infinite] rounded-full bg-oxblood" />
								<span className="relative size-2 rounded-full bg-oxblood" />
							</span>
							<span className="font-mono text-foreground/70 text-xs uppercase">FAQ · Respuestas humanas</span>
						</motion.div>

						<motion.h2
							className="mt-5 font-bold font-display text-[clamp(2.1rem,4.6vw,3.4rem)] text-foreground leading-none tracking-tight"
							style={reduced ? undefined : { y: titleY, transformOrigin: "left top" }}
						>
							Preguntas <br className="hidden sm:block" />
							<span className="relative inline-block">
								frecuentes
								<svg
									aria-hidden="true"
									className="absolute -bottom-1.5 left-0 h-2 w-full text-oxblood"
									fill="none"
									preserveAspectRatio="none"
									viewBox="0 0 240 8"
								>
									<motion.path
										animate={reduced ? undefined : { pathLength: 1 }}
										d="M2 5 C 60 1, 120 7, 238 3"
										initial={reduced ? false : { pathLength: 0 }}
										stroke="currentColor"
										strokeLinecap="round"
										strokeWidth="2.5"
										transition={{ duration: 1.2, delay: 0.3, ease: EASE_OUT_QUINT }}
										viewport={{ once: true, margin: "-25% 0px" }}
										whileInView={reduced ? undefined : { pathLength: 1 }}
									/>
								</svg>
							</span>
							.
						</motion.h2>

						<motion.p
							className="mt-6 max-w-105 text-base text-foreground/70 leading-relaxed"
							style={reduced ? undefined : { opacity: introOpacity }}
						>
							Si tu duda no está acá, te responde una persona del equipo en menos de 24 horas. Nunca un bot.
						</motion.p>
					</div>
				</div>

				{/* RIGHT — accordion with scroll-driven rail + staggered items */}
				<div className="relative md:col-span-7">
					{/* Green territory rail running down the left edge of the column */}
					<motion.span
						aria-hidden="true"
						className="absolute top-2 -left-3 hidden h-[calc(100%-4rem)] w-px origin-top bg-oxblood/50 md:block"
						style={reduced ? undefined : { scaleY: railScaleY }}
					/>

					<ul className="flex flex-col">
						{items.map((item, idx) => (
							<FaqRow
								idx={idx}
								isOpen={openValue === `faq-${idx}`}
								item={item}
								key={item.q}
								onToggle={() => setOpenValue((cur) => (cur === `faq-${idx}` ? null : `faq-${idx}`))}
								reduced={reduced}
							/>
						))}
					</ul>

					{hasExtras && (
						<motion.button
							className="group/more mt-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground/80 text-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-foreground/40 hover:text-foreground"
							initial={reduced ? false : { opacity: 0, y: 8 }}
							onClick={() => setShowAll((v) => !v)}
							transition={{ duration: 0.5, ease: EASE_OUT_QUINT }}
							type="button"
							viewport={{ once: true }}
							whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
						>
							<CaretDownIcon
								className={`transition-transform duration-300 ${showAll ? "rotate-180" : ""}`}
								size={12}
								weight="bold"
							/>
							{showAll ? "Ocultar preguntas" : `Ver ${FAQ_ITEMS.length - VISIBLE_FAQ_COUNT} preguntas más`}
						</motion.button>
					)}
				</div>
			</div>
		</section>
	);
}

interface FaqRowProps {
	idx: number;
	isOpen: boolean;
	item: { q: string; a: string };
	onToggle: () => void;
	reduced: boolean | null;
}

function FaqRow({ idx, isOpen, item, onToggle, reduced }: FaqRowProps) {
	const triggerId = `faq-trigger-${idx}`;
	const panelId = `faq-panel-${idx}`;

	return (
		<motion.li
			className="group/row border-border border-b last:border-b-0"
			initial={reduced ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
			transition={{ duration: 0.55, delay: idx * 0.045, ease: EASE_OUT_QUINT }}
			viewport={{ once: true, margin: "-12% 0px" }}
			whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
		>
			<button
				aria-controls={panelId}
				aria-expanded={isOpen}
				className="flex w-full cursor-pointer items-start gap-6 py-6 text-left transition-transform duration-300 ease-out hover:-translate-y-px"
				id={triggerId}
				onClick={onToggle}
				type="button"
			>
				<span className="mt-1 font-mono text-foreground/55 text-xs tabular-nums">
					{(idx + 1).toString().padStart(2, "0")}
				</span>
				<span className="flex-1 font-display font-medium text-foreground text-lg leading-snug tracking-tight transition-colors duration-200 group-hover/row:text-foreground">
					{item.q}
				</span>
				<span
					aria-hidden="true"
					className="relative mt-1.5 grid size-6 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card text-foreground/70 transition-all duration-300 ease-out group-hover/row:border-oxblood/60 group-hover/row:bg-oxblood/10 group-hover/row:text-foreground"
				>
					<motion.span
						animate={{ rotate: isOpen ? 45 : 0 }}
						className="grid place-items-center"
						transition={{ duration: 0.45, ease: EASE_OUT_QUINT }}
					>
						<PlusIcon size={12} weight="bold" />
					</motion.span>
				</span>
			</button>

			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div
						animate={{ height: "auto", opacity: 1 }}
						aria-labelledby={triggerId}
						className="overflow-hidden"
						exit={{ height: 0, opacity: 0 }}
						id={panelId}
						initial={{ height: 0, opacity: 0 }}
						role="region"
						transition={{
							height: { duration: 0.5, ease: EASE_OUT_QUINT },
							opacity: { duration: 0.35, ease: EASE_OUT_QUINT },
						}}
					>
						<motion.p
							animate={{ y: 0, filter: "blur(0px)" }}
							className="ml-[2.6rem] max-w-[58ch] pr-2 pb-7 text-base text-foreground/72 leading-relaxed"
							exit={{ y: -6, filter: "blur(4px)" }}
							initial={{ y: 8, filter: "blur(4px)" }}
							transition={{ duration: 0.45, ease: EASE_OUT_QUINT, delay: 0.05 }}
						>
							{item.a}
						</motion.p>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.li>
	);
}

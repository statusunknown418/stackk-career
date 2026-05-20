"use client";

import { QuotesIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------------------- */
/* Message chunks — semantic bolding lives inline. Each chunk is one paragraph */
/* "stanza" that reveals as a single unit. Bolded phrases get a hand-drawn     */
/* underline that draws across once the chunk has landed.                     */
/* -------------------------------------------------------------------------- */

interface Fragment {
	readonly emphasis?: boolean;
	readonly id: string;
	readonly text: string;
}

interface Stanza {
	readonly fragments: readonly Fragment[];
	readonly id: string;
}

const TRAILING_WHITESPACE = /\s+$/;

const CHUNKS: readonly Stanza[] = [
	{
		id: "intro",
		fragments: [
			{
				id: "intro-body",
				text: "Llevamos dos años viendo el mismo problema. Talento LATAM bueno, peleando solo contra los filtros automáticos que descartan CVs. CVs que no pasan. Entrevistas que no llegan. Plataformas extranjeras que cobran en dólares y no entienden cómo se contrata acá.",
			},
		],
	},
	{
		id: "build",
		fragments: [
			{ id: "build-lead", text: "Por eso construimos ASSENDIA. ", emphasis: true },
			{
				id: "build-body",
				text: "Coaches reales, con planilla, que ya contrataron en Yape, BCP y Belcorp. IA que reescribe sin volver tu CV genérico. Precios en soles, no en dólares.",
			},
		],
	},
	{
		id: "guarantee",
		fragments: [
			{
				id: "guarantee-lead",
				text: "Garantía de entrevista en 90 días, sin letra chica. ",
				emphasis: true,
			},
			{ id: "guarantee-body", text: "Si no llegas, te devolvemos hasta el último sol." },
		],
	},
	{
		id: "close",
		fragments: [{ id: "close-line", text: "Aquí te esperamos.", emphasis: true }],
	},
];

/* -------------------------------------------------------------------------- */
/* Public                                                                     */
/* -------------------------------------------------------------------------- */

export function FounderMessage() {
	const reduced = useReducedMotion();
	const sectionRef = useRef<HTMLElement>(null);

	// Scroll-linked envelope: tracks the section from when its top enters the
	// viewport bottom to when its bottom leaves the top. We use this for the
	// background "lift in" — the green territory scales from 92% → 100% and
	// the letterboxed inner card eases up as the user scrolls in.
	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ["start end", "end start"],
	});

	const progress = useSpring(scrollYProgress, {
		stiffness: 90,
		damping: 28,
		mass: 0.4,
	});

	// Green background grows from a soft inset to full-bleed as the user
	// scrolls into the moment, then holds. Subtle — never noisy.
	const bgScale = useTransform(progress, [0, 0.35, 0.7, 1], [0.94, 1, 1, 0.98]);
	const bgRadius = useTransform(progress, [0, 0.35, 0.7, 1], ["2.5rem", "0rem", "0rem", "2rem"]);

	// Inner content rides slightly against the background — gives the
	// "letter being lifted out of an envelope" feeling.
	const innerY = useTransform(progress, [0, 0.4], ["3%", "0%"]);

	return (
		<section
			aria-labelledby="founder-message-heading"
			className="relative px-4 py-20 md:py-28"
			id="carta"
			ref={sectionRef}
		>
			{/* Drenched-green territory — scales in on scroll. Only section on the page
			    that owns full-bleed Platzi green. */}
			<motion.div
				aria-hidden="true"
				className="absolute inset-x-4 inset-y-6 -z-10 bg-oxblood md:inset-x-6 md:inset-y-8"
				style={reduced ? undefined : { scale: bgScale, borderRadius: bgRadius, transformOrigin: "50% 50%" }}
			>
				{/* Subtle inner darker layer to add depth without breaking the flat
				    Platzi feel — a quiet vignette, not a gradient. */}
				<div
					aria-hidden="true"
					className="absolute inset-0 [background:radial-gradient(120%_80%_at_50%_120%,oklch(0_0_0/0.18),transparent_60%)]"
				/>
				{/* Hairline grid floor for texture — barely visible on green. */}
				<div
					aria-hidden="true"
					className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,oklch(0_0_0)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0_0_0)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
				/>
			</motion.div>

			<motion.div
				className="relative mx-auto grid w-full max-w-[1180px] grid-cols-12 gap-6 px-6 py-20 md:px-12 md:py-32 lg:py-40"
				style={reduced ? undefined : { y: innerY }}
			>
				{/* Eyebrow — small editorial marker */}
				<motion.div
					className="col-span-12 col-start-1 flex items-center gap-3 font-mono text-[10.5px] text-background/70 uppercase tracking-[0.24em] md:col-span-10 md:col-start-2"
					initial={reduced ? false : { opacity: 0, y: 8 }}
					transition={{ duration: 0.6, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-15% 0px", once: true }}
					whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
				>
					<span aria-hidden="true" className="h-px w-10 bg-foreground/40" />
					<span>Carta abierta · Equipo ASSENDIA</span>
				</motion.div>

				{/* Opening quote mark — drops in first, sets the editorial register */}
				<motion.div
					aria-hidden="true"
					className="col-span-12 col-start-1 mt-10 md:col-span-10 md:col-start-2"
					initial={reduced ? false : { opacity: 0, scale: 0.85, rotate: -3 }}
					transition={{ delay: 0.15, duration: 0.8, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-15% 0px", once: true }}
					whileInView={reduced ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
				>
					<QuotesIcon className="-ml-1 text-background/85" size={56} weight="fill" />
				</motion.div>

				{/* The letter — chunks reveal as units. Each chunk also drives the
				    underline draw for its emphasized phrases. */}
				<h2 className="sr-only" id="founder-message-heading">
					Carta abierta del equipo ASSENDIA
				</h2>

				<div className="col-span-12 col-start-1 mt-6 flex flex-col gap-6 font-display font-medium text-[clamp(1.4rem,3vw,2.4rem)] text-background leading-[1.22] tracking-[-0.022em] md:col-span-9 md:col-start-2 md:mt-8 md:gap-7">
					{CHUNKS.map((stanza, idx) => (
						<StanzaParagraph delay={0.3 + idx * 0.12} key={stanza.id} stanza={stanza} />
					))}
				</div>

				{/* Signature block — fades in last. Abstract avatar (no fake face), */}
				{/* attribution, location. */}
				<motion.footer
					className="col-span-12 col-start-1 mt-14 flex items-center gap-4 md:col-span-10 md:col-start-2 md:mt-20"
					initial={reduced ? false : { opacity: 0, y: 16 }}
					transition={{ delay: 0.95, duration: 0.7, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-15% 0px", once: true }}
					whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
				>
					<SignatureMark />
					<div className="flex flex-col gap-1">
						<span className="font-display-italic font-light text-[1.05rem] text-background leading-tight md:text-[1.2rem]">
							Equipo ASSENDIA
						</span>
						<span className="font-mono text-[10.5px] text-background/65 uppercase tracking-[0.2em]">
							Lima, Perú · Mayo 2026
						</span>
					</div>
					<div aria-hidden="true" className="ml-auto hidden h-px flex-1 bg-foreground/25 md:block" />
				</motion.footer>
			</motion.div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Stanza — one paragraph that reveals as a single chunk, then draws the      */
/* underline beneath any emphasized phrase. The bolded phrase sits on a       */
/* slightly darker green pill so it reads as territory-within-territory.       */
/* -------------------------------------------------------------------------- */

function StanzaParagraph({ stanza, delay }: { stanza: Stanza; delay: number }) {
	const reduced = useReducedMotion();

	return (
		<motion.p
			className="text-balance"
			initial={reduced ? false : { opacity: 0, y: 22, filter: "blur(6px)" }}
			transition={{ delay, duration: 0.9, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-12% 0px", once: true }}
			whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
		>
			{stanza.fragments.map((fragment, fragmentIdx) =>
				fragment.emphasis ? (
					<EmphasisPhrase drawDelay={delay + 0.35 + fragmentIdx * 0.08} key={fragment.id} text={fragment.text} />
				) : (
					<span key={fragment.id}>{fragment.text}</span>
				)
			)}
		</motion.p>
	);
}

/* -------------------------------------------------------------------------- */
/* EmphasisPhrase — wraps a phrase with a hand-drawn-feeling underline that   */
/* draws left → right when the phrase enters view. The underline is a darker  */
/* shade of the green territory, so it reads as a confident accent, not noise.*/
/* -------------------------------------------------------------------------- */

function EmphasisPhrase({ drawDelay, text }: { drawDelay: number; text: string }) {
	const reduced = useReducedMotion();
	// Most phrases end with a sentence space — keep the underline tight to the
	// content, not the trailing whitespace. Render the space outside the span.
	const trimmed = text.replace(TRAILING_WHITESPACE, "");
	const trailingSpace = text.length - trimmed.length > 0 ? text.slice(trimmed.length) : "";

	return (
		<>
			<span
				className={cn(
					"relative inline whitespace-normal font-bold text-background",
					// soft pill behind the phrase — darker green inside the green section
					"[-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
				)}
			>
				<span aria-hidden="true" className="absolute -inset-x-1 -inset-y-0.5 rounded-[6px] bg-[oklch(0_0_0/0.10)]" />
				<span className="relative">{trimmed}</span>
				{/* Hand-drawn underline — SVG path, scaleX from 0 → 1. */}
				<motion.span
					aria-hidden="true"
					className="absolute right-0 -bottom-1 left-0 block h-[6px] origin-left"
					initial={reduced ? false : { scaleX: 0 }}
					transition={{ delay: drawDelay, duration: 0.9, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-12% 0px", once: true }}
					whileInView={reduced ? undefined : { scaleX: 1 }}
				>
					<svg
						aria-hidden="true"
						className="h-full w-full text-background"
						preserveAspectRatio="none"
						viewBox="0 0 200 6"
					>
						<title>underline</title>
						<path
							d="M2 4 Q 50 1, 100 3 T 198 3"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeOpacity="0.9"
							strokeWidth="2.2"
						/>
					</svg>
				</motion.span>
			</span>
			{trailingSpace}
		</>
	);
}

/* -------------------------------------------------------------------------- */
/* SignatureMark — abstract avatar. No fake face, no fake name. A small      */
/* geometric mark that reads as "team", not "person". Pure CSS / SVG.        */
/* -------------------------------------------------------------------------- */

function SignatureMark() {
	const reduced = useReducedMotion();
	return (
		<motion.span
			aria-hidden="true"
			className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground/[0.12] ring-1 ring-foreground/25 ring-inset md:size-14"
			initial={reduced ? false : { scale: 0.6, opacity: 0 }}
			transition={{ delay: 1.05, duration: 0.7, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-15% 0px", once: true }}
			whileInView={reduced ? undefined : { scale: 1, opacity: 1 }}
		>
			<svg className="size-6 text-background md:size-7" fill="none" viewBox="0 0 28 28">
				<title>Marca ASSENDIA</title>
				<motion.path
					d="M4 22 Q 9 6, 14 14 T 24 6"
					fill="none"
					initial={reduced ? false : { pathLength: 0 }}
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2.4"
					transition={{ delay: 1.2, duration: 1.1, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-15% 0px", once: true }}
					whileInView={reduced ? undefined : { pathLength: 1 }}
				/>
			</svg>
		</motion.span>
	);
}

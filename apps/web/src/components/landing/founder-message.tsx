"use client";

import { QuotesIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useMemo, useRef } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

// Word reveal timing — matches the section-title WordReveal: each word rises +
// fades in reading order, staggered. The stagger RESETS per stanza so a long
// letter never accumulates a multi-second delay; each paragraph stays snappy.
const WORD_REVEAL_DURATION = 0.55;
const WORD_STAGGER = 0.05;
// Cap how far the per-stanza stagger can grow so a long stanza's tail words
// don't lag too far behind its head.
const MAX_STAGGER_STEPS = 12;

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

const WORD_SPLIT = /\s+/;

// A single rendered word. `index` is its position WITHIN its own stanza — the
// stagger resets per stanza, so reading order is preserved inside each paragraph
// without one global timeline that would stretch the whole letter.
interface WordToken {
	readonly emphasis: boolean;
	readonly id: string;
	readonly index: number;
	readonly text: string;
}

interface StanzaTokens {
	readonly id: string;
	readonly words: readonly WordToken[];
}

// Flatten each stanza into per-word tokens. The reveal index restarts at 0 for
// every stanza so each paragraph animates as its own short, snappy sweep when it
// enters view — rather than every word sharing one long global delay ramp.
function buildStanzaTokens(chunks: readonly Stanza[]): readonly StanzaTokens[] {
	return chunks.map((stanza) => {
		const words: WordToken[] = [];
		let index = 0;
		for (const fragment of stanza.fragments) {
			const pieces = fragment.text.trim().split(WORD_SPLIT);
			for (const piece of pieces) {
				words.push({
					emphasis: fragment.emphasis ?? false,
					id: `${stanza.id}-${fragment.id}-${index}`,
					index,
					text: piece,
				});
				index += 1;
			}
		}
		return { id: stanza.id, words };
	});
}

const CHUNKS: readonly Stanza[] = [
	{
		id: "intro",
		fragments: [
			{
				id: "intro-body",
				text: "Llevamos años ayudando a talento de LATAM a conseguir trabajo, y siempre topamos con el mismo muro: gente brillante peleando sola contra los filtros automáticos que descartan su CV antes de que un humano lo lea. CVs que no pasan. Entrevistas que no llegan. Y plataformas extranjeras que cobran en dólares sin entender cómo se contrata acá.",
			},
		],
	},
	{
		id: "build",
		fragments: [
			{ id: "build-lead", text: "Por eso construimos ASSENDIA. ", emphasis: true },
			{
				id: "build-body",
				text: "Coaches reales de nuestro equipo que ya consiguieron su lugar en empresas como Mercedes-Benz, Santander, BCP e Intercorp. Un Agente de IA que potencia tu CV sin volverlo genérico.",
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
	const isDesktop = useMediaQuery("md");
	const sectionRef = useRef<HTMLElement>(null);

	// The scroll-linked background choreography (scale / radius / sheen / tilt)
	// only runs on desktop and never under reduced-motion. Mobile renders the
	// static composition instead — that's where Core Web Vitals are tightest, so
	// we don't pay for per-frame scroll transforms or a scroll subscription there.
	const animate = !reduced && isDesktop;

	// Flattened per-stanza word tokens — precomputed once. Drives the staggered
	// whileInView word reveal below (stagger resets per stanza).
	const stanzas = useMemo(() => buildStanzaTokens(CHUNKS), []);

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
	const bgScale = useTransform(progress, [0, 0.35, 0.7, 1], [0.9, 1, 1, 0.97]);
	const bgRadius = useTransform(progress, [0, 0.35, 0.7, 1], ["2.5rem", "0rem", "0rem", "2rem"]);

	// Inner content rides slightly against the background — gives the
	// "letter being lifted out of an envelope" feeling.
	const innerY = useTransform(progress, [0, 0.4], ["3%", "0%"]);

	// Light sheen sweeping across the green on scroll + a subtle entrance tilt —
	// gives the flat territory motion and surface, like light catching the panel.
	const sheenX = useTransform(progress, [0.05, 0.95], ["-45%", "45%"]);
	const cardRotate = useTransform(progress, [0, 0.4], [-2.5, 0]);

	return (
		<section
			aria-labelledby="founder-message-heading"
			className="relative px-4 py-14 md:py-20"
			id="carta"
			ref={sectionRef}
		>
			{/* Drenched-green territory — scales in on scroll. Only section on the page
			    that owns full-bleed Platzi green. */}
			<motion.div
				aria-hidden="true"
				className="absolute inset-y-6 left-1/2 -z-10 w-[calc(100%-2rem)] max-w-320 border-6 border-black bg-oxblood md:inset-y-8 md:w-[calc(100%-3rem)] md:border-[12px]"
				style={
					animate
						? { rotate: cardRotate, scale: bgScale, borderRadius: bgRadius, transformOrigin: "50% 50%", x: "-50%" }
						: { x: "-50%" }
				}
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
				{/* Light sheen — sweeps across the green on scroll */}
				<motion.div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 [background:linear-gradient(115deg,transparent_38%,oklch(1_0_0/0.16)_50%,transparent_62%)]"
					style={animate ? { x: sheenX } : undefined}
				/>
			</motion.div>

			<motion.div
				className="relative mx-auto grid w-full max-w-295 grid-cols-12 gap-6 px-6 py-12 md:px-12 md:py-16"
				style={animate ? { y: innerY } : undefined}
			>
				{/* Eyebrow — small editorial marker */}
				<motion.div
					className="col-span-12 col-start-1 flex items-center gap-3 font-mono text-neutral-950/70 text-xs uppercase md:col-span-10 md:col-start-2"
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
					className="col-span-12 col-start-1 mt-6 md:col-span-10 md:col-start-2"
					initial={reduced ? false : { opacity: 0, scale: 0.85, rotate: -3 }}
					transition={{ delay: 0.15, duration: 0.8, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-15% 0px", once: true }}
					whileInView={reduced ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
				>
					<QuotesIcon className="-ml-1 text-neutral-950/85" size={56} weight="fill" />
				</motion.div>

				{/* The letter — each stanza reveals word-by-word as it enters view,
				    matching the section-title WordReveal. Stagger resets per stanza. */}
				<h2 className="sr-only" id="founder-message-heading">
					Carta abierta del equipo ASSENDIA
				</h2>

				<div className="col-span-12 col-start-1 mt-6 flex flex-col gap-6 font-display font-medium text-[clamp(1.4rem,3vw,2.4rem)] text-neutral-950 leading-tight tracking-tight md:col-span-9 md:col-start-2 md:mt-8 md:gap-7">
					{stanzas.map((stanza) => (
						<p className="text-balance" key={stanza.id}>
							{stanza.words.map((word) => (
								<Word key={word.id} reduced={reduced ?? false} word={word} />
							))}
						</p>
					))}
				</div>

				{/* Signature block — fades in last. Abstract avatar (no fake face), */}
				{/* attribution, location. */}
				<motion.footer
					className="col-span-12 col-start-1 mt-10 flex items-center gap-4 md:col-span-10 md:col-start-2 md:mt-12"
					initial={reduced ? false : { opacity: 0, y: 16 }}
					transition={{ delay: 0.95, duration: 0.7, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-15% 0px", once: true }}
					whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
				>
					<SignatureMark />
					<div className="flex flex-col gap-1">
						<span className="font-display-italic font-light text-base text-neutral-950 leading-tight md:text-xl">
							Equipo ASSENDIA
						</span>
						<span className="font-mono text-neutral-950/65 text-xs uppercase">Lima, Perú</span>
					</div>
					<div aria-hidden="true" className="ml-auto hidden h-px flex-1 bg-foreground/25 md:block" />
				</motion.footer>
			</motion.div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Word — a single word that rises + fades into place as its stanza enters     */
/* view, mirroring the section-title WordReveal. Delay is its in-stanza index  */
/* (capped) × the stagger, so each paragraph plays as its own short sweep.      */
/* Emphasized words keep their stronger weight + a soft pill behind them.      */
/* -------------------------------------------------------------------------- */

function Word({ word, reduced }: { reduced: boolean; word: WordToken }) {
	const className = word.emphasis
		? "relative inline-block font-bold [-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
		: "inline-block";

	// Reading-order delay within the stanza, capped so a long stanza's tail
	// doesn't trail too far behind its opening words.
	const delay = Math.min(word.index, MAX_STAGGER_STEPS) * WORD_STAGGER;

	const inner = (
		<>
			{word.emphasis ? (
				<span aria-hidden="true" className="absolute -inset-x-1 -inset-y-0.5 rounded-md bg-[oklch(0_0_0/0.10)]" />
			) : null}
			<span className="relative">{word.text}</span>
		</>
	);

	// Trailing space lives outside the inline-block so words wrap naturally and
	// the emphasis pill never stretches across the gap between words.
	return (
		<>
			{reduced ? (
				<span className={className}>{inner}</span>
			) : (
				<motion.span
					className={className}
					initial={{ opacity: 0, y: 18 }}
					transition={{ delay, duration: WORD_REVEAL_DURATION, ease: EASE_OUT_QUINT }}
					viewport={{ margin: "-15% 0px", once: true }}
					whileInView={{ opacity: 1, y: 0 }}
				>
					{inner}
				</motion.span>
			)}{" "}
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
			className="block size-12 shrink-0 overflow-hidden rounded-xl md:size-14"
			initial={reduced ? false : { scale: 0.6, opacity: 0 }}
			transition={{ delay: 1.05, duration: 0.7, ease: EASE_OUT_QUINT }}
			viewport={{ margin: "-15% 0px", once: true }}
			whileInView={reduced ? undefined : { scale: 1, opacity: 1 }}
		>
			<img alt="" className="size-full object-cover" height={56} src="/assendia-logo.png" width={56} />
		</motion.span>
	);
}

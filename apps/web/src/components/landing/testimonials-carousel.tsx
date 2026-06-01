"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";
import { useInterval } from "@/hooks/use-interval";
import { TESTIMONIALS, type Testimonial } from "./data";

const REST = TESTIMONIALS.slice(1);

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;
const ROTATE_INTERVAL_MS = 3500;

interface ColumnConfig {
	durationClass: string;
	reverse: boolean;
	visibilityClass: string;
}

const COLUMN_COUNT = 4;
const REPEAT = 2;
const REPEAT_INDICES = Array.from({ length: REPEAT }, (_, i) => i);

const COLUMN_CONFIGS: readonly ColumnConfig[] = [
	{ durationClass: "[--duration:30s]", reverse: false, visibilityClass: "flex" },
	{ durationClass: "[--duration:26s]", reverse: true, visibilityClass: "hidden sm:flex" },
	{ durationClass: "[--duration:34s]", reverse: false, visibilityClass: "hidden md:flex" },
	{ durationClass: "[--duration:28s]", reverse: true, visibilityClass: "hidden lg:flex" },
];

function distributeIntoColumns(items: readonly Testimonial[], cols: number): Testimonial[][] {
	const columns: Testimonial[][] = Array.from({ length: cols }, () => []);
	items.forEach((item, idx) => {
		columns[idx % cols].push(item);
	});
	return columns;
}

const TESTIMONIAL_COLUMNS = distributeIntoColumns(REST, COLUMN_COUNT);

function FeaturedTestimonial() {
	const reduced = useReducedMotion();
	const [activeIndex, setActiveIndex] = useState(0);
	const [paused, setPaused] = useState(false);

	const goTo = useCallback((index: number) => {
		setActiveIndex(((index % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length);
	}, []);

	// Auto-advance every few seconds, paused on hover or when the user prefers
	// reduced motion. `null` delay stops the timer (see useInterval).
	useInterval(
		() => setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length),
		reduced || paused ? null : ROTATE_INTERVAL_MS
	);

	const active = TESTIMONIALS[activeIndex];

	return (
		<header
			className="mx-auto mb-14 max-w-230 text-center"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			<motion.span
				className="inline-block font-mono text-foreground/55 text-xs uppercase tracking-widest"
				initial={reduced ? false : { opacity: 0, y: 8 }}
				transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT_QUINT }}
				viewport={{ margin: "-15% 0px", once: true }}
				whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
			>
				Casos verificados
			</motion.span>

			<div className="relative mt-6 min-h-[clamp(7rem,16vw,12rem)]">
				<AnimatePresence initial={false} mode="wait">
					<motion.blockquote
						animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
						className="text-balance font-display font-medium text-[clamp(1.5rem,3.4vw,2.75rem)] text-foreground leading-tight tracking-tight"
						exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16, filter: "blur(8px)" }}
						initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(8px)" }}
						key={active.id}
						transition={reduced ? { duration: 0.2 } : { duration: 0.6, ease: EASE_OUT_QUINT }}
					>
						<span aria-hidden="true" className="font-display-italic text-foreground/55">
							“
						</span>
						{active.quote}
						<span aria-hidden="true" className="font-display-italic text-foreground/55">
							”
						</span>
					</motion.blockquote>
				</AnimatePresence>
			</div>

			<AnimatePresence initial={false} mode="wait">
				<motion.p
					animate={{ opacity: 1, y: 0 }}
					className="mt-6 font-mono text-foreground/65 text-xs uppercase tracking-widest"
					exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
					initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
					key={`${active.id}-meta`}
					transition={reduced ? { duration: 0.2 } : { duration: 0.5, ease: EASE_OUT_QUINT }}
				>
					{active.name} · {active.role} · {active.location}
				</motion.p>
			</AnimatePresence>

			<div className="mt-8 flex items-center justify-center gap-4">
				<button
					aria-label="Caso anterior"
					className="grid size-9 place-items-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground"
					onClick={() => goTo(activeIndex - 1)}
					type="button"
				>
					<span aria-hidden="true">‹</span>
				</button>

				<div className="flex items-center gap-2" role="tablist">
					{TESTIMONIALS.map((t, idx) => {
						const isActive = idx === activeIndex;
						return (
							<button
								aria-label={`Ver caso de ${t.name}`}
								aria-selected={isActive}
								className={`h-1.5 rounded-full transition-all duration-300 ${
									isActive ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25 hover:bg-foreground/45"
								}`}
								key={t.id}
								onClick={() => goTo(idx)}
								role="tab"
								type="button"
							/>
						);
					})}
				</div>

				<button
					aria-label="Caso siguiente"
					className="grid size-9 place-items-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground"
					onClick={() => goTo(activeIndex + 1)}
					type="button"
				>
					<span aria-hidden="true">›</span>
				</button>
			</div>
		</header>
	);
}

export function TestimonialsCarousel() {
	return (
		<section className="overflow-hidden border-border border-y bg-foreground/[0.025] px-6 py-16 md:py-24" id="casos">
			<div className="mx-auto max-w-7xl">
				<FeaturedTestimonial />

				<div className="relative h-160 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] md:h-190">
					<div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{TESTIMONIAL_COLUMNS.map((column, idx) => (
							<TestimonialColumn
								config={COLUMN_CONFIGS[idx]}
								key={`col-${column[0]?.id ?? idx}`}
								testimonials={column}
							/>
						))}
					</div>
				</div>

				<p className="mt-8 text-center font-mono text-foreground/55 text-xs uppercase tracking-widest">
					Una muestra de las 90 reseñas · pasa el cursor para pausar
				</p>
			</div>
		</section>
	);
}

function TestimonialColumn({ config, testimonials }: { config: ColumnConfig; testimonials: readonly Testimonial[] }) {
	const innerClasses = [
		"flex shrink-0 flex-col gap-(--gap) animate-marquee-y motion-reduce:animate-none",
		"group-hover/column:[animation-play-state:paused]",
		config.reverse ? "[animation-direction:reverse]" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={`group/column relative h-full flex-col gap-(--gap) overflow-hidden [--gap:1rem] ${config.durationClass} ${config.visibilityClass}`}
		>
			{REPEAT_INDICES.map((rep) => (
				<div className={innerClasses} key={`rep-${rep}`}>
					{testimonials.map((t) => (
						<TestimonialCard key={`${rep}-${t.id}`} testimonial={t} />
					))}
				</div>
			))}
		</div>
	);
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	return (
		<article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors duration-300 hover:border-foreground/20">
			<header className="flex items-center gap-3">
				<span
					aria-hidden="true"
					className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.06] font-semibold text-foreground text-xs"
				>
					{testimonial.initials}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate font-display font-semibold text-foreground text-sm leading-tight tracking-tight">
						{testimonial.name}
					</p>
					<p className="truncate font-display-italic font-light text-foreground/60 text-xs leading-tight">
						{testimonial.role}
					</p>
				</div>
			</header>

			<blockquote className="text-foreground/80 text-sm leading-relaxed">“{testimonial.quote}”</blockquote>

			<footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-border border-t pt-3">
				{testimonial.chip && (
					<span className="rounded-full border border-border bg-foreground/[0.06] px-2 py-0.5 font-medium font-mono text-foreground text-xs uppercase tracking-widest">
						{testimonial.chip}
					</span>
				)}
				<span className="ml-auto font-mono text-foreground/55 text-xs uppercase tracking-widest">
					{testimonial.location}
				</span>
			</footer>
		</article>
	);
}

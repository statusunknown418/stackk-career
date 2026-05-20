"use client";

import { motion, useReducedMotion } from "motion/react";
import { WordReveal } from "@/components/ui/word-reveal";
import { TESTIMONIALS, type Testimonial } from "./data";

const FEATURED = TESTIMONIALS[0];
const REST = TESTIMONIALS.slice(1);

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

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

export function TestimonialsCarousel() {
	const reduced = useReducedMotion();

	return (
		<section className="overflow-hidden px-6 py-16 md:py-24" id="casos">
			<div className="mx-auto max-w-[1200px]">
				<header className="mx-auto mb-14 max-w-[920px] text-center">
					<motion.span
						className="inline-block font-mono text-[11px] text-foreground/55 uppercase tracking-[0.22em]"
						initial={reduced ? false : { opacity: 0, y: 8 }}
						transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT_QUINT }}
						viewport={{ margin: "-15% 0px", once: true }}
						whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
					>
						Casos verificados
					</motion.span>

					<blockquote className="mt-6 text-balance font-display font-medium text-[clamp(1.5rem,3.4vw,2.75rem)] text-foreground leading-[1.15] tracking-[-0.025em]">
						<motion.span
							aria-hidden="true"
							className="inline-block font-display-italic text-foreground/55"
							initial={reduced ? false : { opacity: 0, scale: 0.85 }}
							style={{ transformOrigin: "50% 70%" }}
							transition={reduced ? { duration: 0 } : { delay: 0.25, duration: 0.7, ease: EASE_OUT_QUINT }}
							viewport={{ margin: "-15% 0px", once: true }}
							whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
						>
							“
						</motion.span>
						<WordReveal delayStart={0.35} stagger={0.035}>
							{FEATURED.quote}
						</WordReveal>
						<motion.span
							aria-hidden="true"
							className="inline-block font-display-italic text-foreground/55"
							initial={reduced ? false : { opacity: 0, scale: 0.85 }}
							style={{ transformOrigin: "50% 70%" }}
							transition={reduced ? { duration: 0 } : { delay: 0.55, duration: 0.7, ease: EASE_OUT_QUINT }}
							viewport={{ margin: "-15% 0px", once: true }}
							whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
						>
							”
						</motion.span>
					</blockquote>

					<motion.p
						className="mt-6 font-mono text-[11px] text-foreground/65 uppercase tracking-[0.16em]"
						initial={reduced ? false : { opacity: 0, y: 12 }}
						transition={reduced ? { duration: 0 } : { delay: 0.7, duration: 0.7, ease: EASE_OUT_QUINT }}
						viewport={{ margin: "-15% 0px", once: true }}
						whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
					>
						{FEATURED.name} · {FEATURED.role} · {FEATURED.location}
					</motion.p>
				</header>

				<div className="relative h-[640px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] md:h-[760px]">
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

				<p className="mt-8 text-center font-mono text-[10px] text-foreground/45 uppercase tracking-[0.18em]">
					Una muestra de las 380 reseñas · pasa el cursor para pausar
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
					className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.06] font-semibold text-[11px] text-foreground"
				>
					{testimonial.initials}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate font-display font-semibold text-[13.5px] text-foreground leading-tight tracking-tight">
						{testimonial.name}
					</p>
					<p className="truncate font-display-italic font-light text-[12px] text-foreground/60 leading-tight">
						{testimonial.role}
					</p>
				</div>
			</header>

			<blockquote className="text-[13.5px] text-foreground/80 leading-[1.55]">“{testimonial.quote}”</blockquote>

			<footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-border border-t pt-3">
				{testimonial.chip && (
					<span className="rounded-full border border-border bg-foreground/[0.06] px-2 py-0.5 font-medium font-mono text-[9px] text-foreground uppercase tracking-[0.08em]">
						{testimonial.chip}
					</span>
				)}
				<span className="ml-auto font-mono text-[10px] text-foreground/55 uppercase tracking-[0.1em]">
					{testimonial.location}
				</span>
			</footer>
		</article>
	);
}

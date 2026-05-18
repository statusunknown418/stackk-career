import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { TESTIMONIALS, type Testimonial } from "./data";

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

const TESTIMONIAL_COLUMNS = distributeIntoColumns(TESTIMONIALS, COLUMN_COUNT);

export function TestimonialsCarousel() {
	return (
		<section className="overflow-hidden px-6 py-16 md:py-24" id="casos">
			<Reveal>
				<header className="mx-auto mb-14 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/70 uppercase tracking-[0.18em]">Casos reales</span>
					<h2 className="mt-3 max-w-[820px] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
						<WordReveal>Casos verificados. Nombres reales, empresas reales.</WordReveal>
					</h2>
					<p className="mt-5 max-w-[580px] text-[1rem] text-foreground/65 leading-[1.55]">
						Una muestra de las 380 reseñas. Lima, Bogotá, Buenos Aires, Quito, Montevideo y más.
					</p>
				</header>
			</Reveal>

			<div className="relative mx-auto h-[640px] max-w-[1200px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] md:h-[760px]">
				<div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{TESTIMONIAL_COLUMNS.map((column, idx) => (
						<TestimonialColumn config={COLUMN_CONFIGS[idx]} key={`col-${column[0]?.id ?? idx}`} testimonials={column} />
					))}
				</div>
			</div>
		</section>
	);
}

function TestimonialColumn({ config, testimonials }: { config: ColumnConfig; testimonials: readonly Testimonial[] }) {
	const innerClasses = [
		"flex shrink-0 flex-col gap-(--gap) animate-marquee-y",
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

const MAX_TILT = 6;

function handleTiltMove(e: React.MouseEvent<HTMLElement>) {
	const el = e.currentTarget;
	const r = el.getBoundingClientRect();
	const nx = (e.clientX - r.left) / r.width - 0.5;
	const ny = (e.clientY - r.top) / r.height - 0.5;
	el.style.setProperty("--rx", `${ny * -MAX_TILT}deg`);
	el.style.setProperty("--ry", `${nx * MAX_TILT}deg`);
}

function handleTiltLeave(e: React.MouseEvent<HTMLElement>) {
	const el = e.currentTarget;
	el.style.setProperty("--rx", "0deg");
	el.style.setProperty("--ry", "0deg");
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	return (
		<article
			className="group/tcard flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-card/70 p-5 shadow-[0_1px_2px_-1px_oklch(0.13_0.005_250/0.5)] transition-[transform,border-color,background-color] duration-300 ease-out [transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] hover:border-foreground/20 hover:bg-card hover:shadow-[0_18px_40px_-22px_oklch(0.13_0.005_250/0.55)] motion-reduce:transform-none"
			onMouseLeave={handleTiltLeave}
			onMouseMove={handleTiltMove}
		>
			<header className="flex items-center gap-3">
				<span
					aria-hidden="true"
					className={`grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${testimonial.gradient} font-semibold text-[11px] text-[oklch(0.99_0.003_130)] shadow-[0_4px_10px_-3px_oklch(0.13_0.005_250/0.4)]`}
				>
					{testimonial.initials}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate font-display-italic font-light text-[12px] text-foreground/60 leading-tight">
						{testimonial.role}
					</p>
					<p className="truncate font-display font-semibold text-[13.5px] text-foreground leading-tight tracking-tight">
						{testimonial.name}
					</p>
				</div>
			</header>

			<blockquote className="text-[13.5px] text-foreground/80 leading-[1.55]">“{testimonial.quote}”</blockquote>

			<footer className="flex flex-wrap items-center gap-x-2 gap-y-1">
				{testimonial.chip && (
					<span className="rounded-full border border-marigold/30 bg-marigold/10 px-2 py-0.5 font-medium font-mono text-[9px] text-marigold uppercase tracking-[0.08em]">
						{testimonial.chip}
					</span>
				)}
				<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.1em]">
					{testimonial.location}
				</span>
			</footer>
		</article>
	);
}

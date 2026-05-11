import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";
import { TESTIMONIALS, type Testimonial } from "./data";

interface RowConfig {
	animation: string;
	id: string;
}

const ROW_CONFIGS: readonly RowConfig[] = [
	{ id: "row-top", animation: "animate-marquee" },
	{ id: "row-mid", animation: "animate-marquee-reverse" },
	{ id: "row-bot", animation: "animate-marquee-slow" },
];

function chunkRows(items: readonly Testimonial[], rows: number): Testimonial[][] {
	const out: Testimonial[][] = Array.from({ length: rows }, () => []);
	items.forEach((item, i) => {
		out[i % rows].push(item);
	});
	return out;
}

export function TestimonialsCarousel() {
	const rows = chunkRows(TESTIMONIALS, ROW_CONFIGS.length);

	return (
		<section className="overflow-hidden px-6 py-32" id="casos">
			<Reveal>
				<header className="mx-auto mb-20 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/55 uppercase tracking-[0.18em]">— Casos reales</span>
					<h2 className="mt-4 max-w-[900px] font-bold font-display text-[clamp(2.4rem,5.6vw,4.5rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
						<WordReveal>Del CV ignorado a firmar oferta.</WordReveal>
					</h2>
					<p className="mt-6 max-w-[620px] text-[1.05rem] text-foreground/65 leading-[1.55]">
						Historias reales — selección curada de Lima, Bogotá, Buenos Aires, Quito, Montevideo y más.
					</p>
				</header>
			</Reveal>

			<div className="relative mx-auto max-w-[1200px] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
				<div className="flex flex-col gap-5 py-3">
					{ROW_CONFIGS.map((config, idx) => (
						<TestimonialRow animation={config.animation} items={rows[idx] ?? []} key={config.id} />
					))}
				</div>
			</div>
		</section>
	);
}

function TestimonialRow({ items, animation }: { items: Testimonial[]; animation: string }) {
	return (
		<div className="group/row overflow-hidden">
			<div
				className={cn(
					"flex w-max items-stretch gap-5 will-change-transform group-hover/row:[animation-play-state:paused]",
					animation
				)}
			>
				{items.map((t) => (
					<TestimonialCard key={`a-${t.id}`} testimonial={t} />
				))}
				{items.map((t) => (
					<TestimonialCard key={`b-${t.id}`} testimonial={t} />
				))}
				{items.map((t) => (
					<TestimonialCard key={`c-${t.id}`} testimonial={t} />
				))}
			</div>
		</div>
	);
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	return (
		<article className="flex w-[340px] shrink-0 flex-col gap-4 rounded-xl border border-foreground/10 bg-card p-6 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-foreground/25 sm:w-[380px]">
			<span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-marigold/35 bg-marigold/12 px-3 py-1 font-display font-semibold text-[13px] text-foreground tracking-tight">
				<span aria-hidden="true" className="size-1.5 rounded-full bg-marigold" />
				{testimonial.chip}
			</span>

			<blockquote className="flex-1 text-[15px] text-foreground leading-[1.55]">{testimonial.quote}</blockquote>

			<footer className="flex items-center gap-3 border-foreground/10 border-t pt-4">
				<span
					aria-hidden="true"
					className={`grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${testimonial.gradient} font-semibold text-white text-xs`}
				>
					{testimonial.initials}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-foreground text-sm">{testimonial.name}</p>
					<p className="truncate text-foreground/55 text-xs">
						{testimonial.role} · {testimonial.location}
					</p>
				</div>
			</footer>
		</article>
	);
}

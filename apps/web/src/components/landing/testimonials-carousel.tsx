import { StarIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { TESTIMONIALS, type Testimonial } from "./data";

interface RowConfig {
	animation: string;
	id: string;
	tilt: string;
}

const ROW_CONFIGS: readonly RowConfig[] = [
	{ id: "row-top", tilt: "-rotate-[1deg]", animation: "animate-marquee" },
	{ id: "row-mid", tilt: "rotate-[0.5deg]", animation: "animate-marquee-reverse" },
	{ id: "row-bot", tilt: "-rotate-[0.7deg]", animation: "animate-marquee-slow" },
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
			<div className="mx-auto mb-16 grid max-w-[1200px] gap-6 md:grid-cols-12">
				<div className="md:col-span-8">
					<div className="flex items-center gap-3">
						<span className="font-mono text-[11px] text-oxblood uppercase tabular-nums tracking-[0.22em]">§06</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">Casos reales</span>
					</div>
					<h2 className="mt-5 font-bold font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1] tracking-[-0.035em]">
						2.400+ CVs scoreados.{" "}
						<span className="font-display-italic font-semibold text-oxblood">Cientos de ofertas</span> después.
					</h2>
				</div>
				<div className="flex items-end md:col-span-3 md:col-start-10">
					<p className="text-[15px] text-foreground/70 leading-[1.55]">
						380 reseñas verificadas con score 4.9/5. Una selección de Lima, Bogotá, CDMX, Buenos Aires y más.
					</p>
				</div>
			</div>

			<div className="relative mx-auto max-w-[1200px] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
				<div className="flex flex-col gap-5 py-3">
					{ROW_CONFIGS.map((config, idx) => (
						<TestimonialRow animation={config.animation} items={rows[idx] ?? []} key={config.id} tilt={config.tilt} />
					))}
				</div>
			</div>
		</section>
	);
}

function TestimonialRow({ items, animation, tilt }: { items: Testimonial[]; animation: string; tilt: string }) {
	return (
		<div className="group/row overflow-hidden">
			<div
				className={cn(
					"flex w-max items-stretch gap-5 will-change-transform group-hover/row:[animation-play-state:paused]",
					animation
				)}
			>
				{items.map((t) => (
					<TestimonialCard key={`a-${t.id}`} testimonial={t} tilt={tilt} />
				))}
				{items.map((t) => (
					<TestimonialCard key={`b-${t.id}`} testimonial={t} tilt={tilt} />
				))}
				{items.map((t) => (
					<TestimonialCard key={`c-${t.id}`} testimonial={t} tilt={tilt} />
				))}
			</div>
		</div>
	);
}

function TestimonialCard({ testimonial, tilt }: { testimonial: Testimonial; tilt: string }) {
	return (
		<article
			className={cn(
				"flex w-[340px] shrink-0 flex-col gap-3 rounded-sm border border-foreground/10 bg-card p-6 shadow-[var(--shadow-card-soft)] transition-transform hover:rotate-0 sm:w-[380px]",
				tilt
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex text-marigold">
					{[0, 1, 2, 3, 4].map((i) => (
						<StarIcon key={i} size={13} weight="fill" />
					))}
				</div>
				<span className="shrink-0 rounded-full bg-oxblood/10 px-2.5 py-1 font-mono text-[10px] text-oxblood uppercase tracking-[0.12em]">
					{testimonial.chip}
				</span>
			</div>

			<span aria-hidden="true" className="font-bold font-display text-5xl text-oxblood/60 leading-[0.4]">
				“
			</span>

			<blockquote className="-mt-1 flex-1 text-[14.5px] text-foreground leading-[1.5]">{testimonial.quote}</blockquote>

			<footer className="flex items-center gap-3 border-foreground/10 border-t pt-4">
				<span
					aria-hidden="true"
					className={`grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${testimonial.gradient} font-display font-semibold text-white text-xs`}
				>
					{testimonial.initials}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate font-display font-medium text-foreground text-sm">{testimonial.name}</p>
					<p className="truncate font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">
						{testimonial.role}
					</p>
				</div>
			</footer>
		</article>
	);
}

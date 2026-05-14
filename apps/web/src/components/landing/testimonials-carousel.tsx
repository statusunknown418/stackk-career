import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { TESTIMONIALS, type Testimonial } from "./data";

export function TestimonialsCarousel() {
	return (
		<section className="overflow-hidden px-6 py-24" id="casos">
			<Reveal>
				<header className="mx-auto mb-14 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/70 uppercase tracking-[0.18em]">Casos reales</span>
					<h2 className="mt-3 max-w-[820px] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
						<WordReveal>Del CV ignorado a firmar oferta.</WordReveal>
					</h2>
					<p className="mt-5 max-w-[580px] text-[1rem] text-foreground/65 leading-[1.55]">
						Historias reales. Selección curada de Lima, Bogotá, Buenos Aires, Quito, Montevideo y más.
					</p>
				</header>
			</Reveal>

			<div className="relative mx-auto max-w-[1400px] [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
				<div className="group/row [overflow-x:clip] [overflow-y:visible]">
					<div className="flex w-max animate-marquee items-stretch gap-5 will-change-transform group-hover/row:[animation-play-state:paused]">
						{TESTIMONIALS.map((t) => (
							<TestimonialCard key={`a-${t.id}`} testimonial={t} />
						))}
						{TESTIMONIALS.map((t) => (
							<TestimonialCard key={`b-${t.id}`} testimonial={t} />
						))}
						{TESTIMONIALS.map((t) => (
							<TestimonialCard key={`c-${t.id}`} testimonial={t} />
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	return (
		<article className="flex w-[340px] shrink-0 flex-col items-center gap-6 rounded-2xl bg-card/45 px-7 py-9 text-center transition-colors duration-300 hover:bg-card/85 sm:w-[400px]">
			<span
				aria-hidden="true"
				className={`grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br ${testimonial.gradient} font-semibold text-base text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]`}
			>
				{testimonial.initials}
			</span>

			<blockquote className="font-display text-[1.05rem] text-foreground leading-[1.55] tracking-tight">
				“{testimonial.quote}”
			</blockquote>

			<footer className="mt-auto flex flex-col items-center gap-1.5">
				{testimonial.chip && (
					<span className="rounded-full border border-marigold/30 bg-marigold/10 px-2.5 py-0.5 font-medium font-mono text-[10px] text-marigold uppercase tracking-[0.06em]">
						{testimonial.chip}
					</span>
				)}
				<p className="font-display font-semibold text-[14px] text-foreground tracking-tight">{testimonial.name}</p>
				<p className="text-[12px] text-foreground/65">
					{testimonial.role} · {testimonial.location}
				</p>
			</footer>
		</article>
	);
}

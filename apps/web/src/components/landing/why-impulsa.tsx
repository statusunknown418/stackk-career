import { Reveal } from "@/components/ui/reveal";
import { WHY_REASONS } from "./data";

export function WhyImpulsa() {
	return (
		<section className="px-6 py-32" id="por-que">
			<div className="mx-auto max-w-[1200px]">
				<Reveal>
					<header className="mb-20 max-w-[820px]">
						<span className="text-foreground/55 text-sm">Por qué IMPULSA</span>
						<h2 className="mt-4 font-bold font-display text-[clamp(2.4rem,5.6vw,4.5rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
							Lo que LATAM no tenía.
						</h2>
					</header>
				</Reveal>

				<div className="grid gap-x-12 gap-y-16 md:grid-cols-2">
					{WHY_REASONS.map((reason, idx) => (
						<Reveal delay={(idx % 2) * 0.08} key={reason.number}>
							<article>
								<h3 className="font-display font-semibold text-[clamp(1.5rem,2.4vw,2rem)] text-foreground leading-[1.1] tracking-[-0.025em]">
									{reason.title} {reason.emphasis}
								</h3>
								<p className="mt-4 max-w-[44ch] text-[15px] text-foreground/65 leading-[1.6]">{reason.body}</p>
							</article>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}

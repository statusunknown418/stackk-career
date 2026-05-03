import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, type Plan } from "./data";

export function Pricing() {
	return (
		<section className="px-6 py-32" id="planes">
			<div className="mx-auto mb-16 grid max-w-[1200px] gap-6 md:grid-cols-12">
				<div className="md:col-span-7">
					<div className="flex items-center gap-3">
						<span className="font-display-italic text-2xl text-oxblood leading-none">§04</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
							Suscripciones · ninguna
						</span>
					</div>
					<h2 className="mt-5 font-display font-medium text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[0.98] tracking-[-0.04em]">
						Pagás <span className="font-display-italic font-light text-oxblood">una vez.</span> Mantenés el aprendizaje.
					</h2>
				</div>
				<div className="flex items-end md:col-span-4 md:col-start-9">
					<p className="font-serif text-foreground/75 text-lg leading-[1.5]">
						Sin suscripciones, sin sorpresas. El diagnóstico siempre es{" "}
						<span className="font-medium font-sans text-foreground not-italic">gratis</span>.
					</p>
				</div>
			</div>

			<div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-4 md:grid-cols-3">
				{PLANS.map((plan, idx) => (
					<PriceCard key={plan.id} plan={plan} position={idx} />
				))}
			</div>

			<p className="mx-auto mt-10 max-w-[600px] text-center font-serif text-base text-foreground/65 italic">
				¿Dudas? El diagnóstico de 20 minutos es gratis. Si después no querés seguir, te vas con feedback útil.
			</p>
		</section>
	);
}

function PriceCard({ plan, position }: { plan: Plan; position: number }) {
	const featured = plan.featured ?? false;
	const planNumber = String(position + 1).padStart(2, "0");

	return (
		<div
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-sm border p-9 transition",
				featured
					? "scale-[1.02] border-transparent bg-foreground text-background shadow-[0_30px_70px_-20px_oklch(0.46_0.18_22_/_0.5)] hover:scale-[1.025]"
					: "border-foreground/12 bg-card text-foreground hover:-translate-y-1 hover:border-oxblood/30 hover:shadow-[0_24px_50px_-16px_oklch(0.18_0.02_40_/_0.25)]"
			)}
		>
			{featured && (
				<>
					<span
						aria-hidden="true"
						className="pointer-events-none absolute -top-1/2 -right-1/3 size-[140%] rounded-full bg-[radial-gradient(circle,_var(--oxblood)_0%,_transparent_55%)] opacity-50 mix-blend-screen"
					/>
					<span
						aria-hidden="true"
						className="pointer-events-none absolute -bottom-1/3 -left-1/4 size-[120%] rounded-full bg-[radial-gradient(circle,_var(--marigold)_0%,_transparent_55%)] opacity-30 mix-blend-screen"
					/>
				</>
			)}

			<div className="relative">
				<div className="flex items-baseline justify-between">
					<span
						className={cn(
							"font-mono text-[10px] uppercase tracking-[0.18em]",
							featured ? "text-marigold" : "text-foreground/55"
						)}
					>
						Plan Nº {planNumber}
					</span>
					{featured && (
						<span className="rounded-full bg-marigold px-3 py-1 font-display-italic font-medium text-[11px] text-foreground">
							el más elegido
						</span>
					)}
				</div>

				<h3
					className={cn(
						"mt-4 font-display font-medium text-[2.2rem] leading-none tracking-[-0.03em]",
						featured ? "text-background" : "text-foreground"
					)}
				>
					{plan.name}
				</h3>
				<p className={cn("mt-2 font-serif text-base italic", featured ? "text-background/75" : "text-foreground/65")}>
					{plan.tagline}
				</p>

				<div className="mt-8 flex items-baseline gap-1.5">
					<span
						className={cn(
							"font-display-italic font-light text-[1.6rem] leading-none",
							featured ? "text-marigold" : "text-oxblood"
						)}
					>
						$
					</span>
					<span className="numeral font-display font-medium text-[3.6rem] leading-[0.85] tracking-[-0.045em]">
						{plan.priceUsd}
					</span>
					<span
						className={cn(
							"font-mono text-xs uppercase tracking-[0.16em]",
							featured ? "text-background/60" : "text-foreground/55"
						)}
					>
						usd
					</span>
				</div>
				<p
					className={cn(
						"mt-2 font-mono text-[10px] uppercase tracking-[0.16em]",
						featured ? "text-background/55" : "text-foreground/50"
					)}
				>
					{plan.per}
				</p>

				<div
					className={cn(
						"my-7 h-px bg-[length:8px_1px] bg-[linear-gradient(to_right,currentColor_0,currentColor_60%,transparent_60%)]",
						featured ? "text-background/20" : "text-foreground/15"
					)}
				/>

				<ul className="flex flex-1 flex-col gap-3">
					{plan.features.map((feat) => (
						<li className="flex items-start gap-2.5 text-sm leading-snug" key={feat}>
							<span
								className={cn(
									"mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
									featured ? "bg-marigold/25 text-marigold" : "bg-oxblood/12 text-oxblood"
								)}
							>
								<CheckIcon size={11} weight="bold" />
							</span>
							<span className={cn(featured ? "text-background/90" : "text-foreground/85")}>{feat}</span>
						</li>
					))}
				</ul>

				<a
					className={cn(
						buttonVariants({ size: "lg", variant: featured ? "secondary" : "outline" }),
						"mt-9 w-full",
						featured && "border-marigold bg-marigold text-foreground hover:bg-marigold/90"
					)}
					href="#planes"
				>
					{plan.cta}
					<ArrowRightIcon weight="bold" />
				</a>
			</div>
		</div>
	);
}

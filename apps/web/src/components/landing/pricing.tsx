import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, type Plan, SINGLE_SESSION } from "./data";

export function Pricing() {
	return (
		<section className="px-6 py-32" id="planes">
			<div className="mx-auto mb-16 grid max-w-[1200px] gap-6 md:grid-cols-12">
				<div className="md:col-span-7">
					<div className="flex items-center gap-3">
						<span className="font-mono text-[11px] text-oxblood uppercase tabular-nums tracking-[0.22em]">§04</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
							Precios en soles · sin sorpresas
						</span>
					</div>
					<h2 className="mt-5 font-bold font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1] tracking-[-0.035em]">
						Suscripciones simples. <span className="font-display-italic font-semibold text-oxblood">Cancelás</span>{" "}
						cuando quieras.
					</h2>
				</div>
				<div className="flex items-end md:col-span-4 md:col-start-9">
					<p className="text-[15px] text-foreground/75 leading-[1.55]">
						Score CV <span className="font-semibold text-foreground">gratis para siempre</span>. Pro desde S/79/mes.
						Premium para el camino completo de CV a oferta laboral.
					</p>
				</div>
			</div>

			<div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-4 md:grid-cols-3">
				{PLANS.map((plan, idx) => (
					<PriceCard key={plan.id} plan={plan} position={idx} />
				))}
			</div>

			<SingleSessionCard />
		</section>
	);
}

function PriceCard({ plan, position }: { plan: Plan; position: number }) {
	const featured = plan.featured ?? false;
	const planNumber = String(position + 1).padStart(2, "0");
	const isFree = plan.priceSoles === 0;

	return (
		<div
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-2xl border p-9 transition",
				featured
					? "scale-[1.02] border-transparent bg-foreground text-background shadow-[0_30px_70px_-20px_oklch(0.61_0.13_162_/_0.5)] hover:scale-[1.025]"
					: "border-foreground/12 bg-card text-foreground hover:-translate-y-1 hover:border-oxblood/30 hover:shadow-[0_24px_50px_-16px_oklch(0.22_0.03_175_/_0.2)]"
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
						<span className="rounded-full bg-marigold px-3 py-1 font-bold font-display text-[10px] text-white uppercase tracking-[0.14em]">
							Más popular
						</span>
					)}
				</div>

				<h3
					className={cn(
						"mt-4 font-bold font-display text-[2rem] leading-none tracking-[-0.025em]",
						featured ? "text-background" : "text-foreground"
					)}
				>
					{plan.name}
				</h3>
				<p className={cn("mt-2 text-[14px] leading-[1.5]", featured ? "text-background/75" : "text-foreground/65")}>
					{plan.tagline}
				</p>

				<div className="mt-7 flex items-baseline gap-1.5">
					<span
						className={cn(
							"font-bold font-display text-[1.4rem] leading-none",
							featured ? "text-marigold" : "text-oxblood"
						)}
					>
						S/
					</span>
					<span className="numeral font-display font-extrabold text-[3.4rem] leading-[0.85] tracking-[-0.04em]">
						{plan.priceSoles}
					</span>
					<span
						className={cn(
							"font-mono text-xs uppercase tracking-[0.16em]",
							featured ? "text-background/60" : "text-foreground/55"
						)}
					>
						{isFree ? "" : "/ mes"}
					</span>
				</div>
				{!isFree && (
					<p
						className={cn(
							"mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em]",
							featured ? "text-background/55" : "text-foreground/50"
						)}
					>
						≈ ${plan.priceUsd} usd · {plan.per}
					</p>
				)}
				{isFree && (
					<p
						className={cn(
							"mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em]",
							featured ? "text-background/55" : "text-foreground/50"
						)}
					>
						{plan.per}
					</p>
				)}

				<div
					className={cn(
						"my-7 h-px bg-[length:8px_1px] bg-[linear-gradient(to_right,currentColor_0,currentColor_60%,transparent_60%)]",
						featured ? "text-background/20" : "text-foreground/15"
					)}
				/>

				<ul className="flex flex-1 flex-col gap-3">
					{plan.features.map((feat) => (
						<li className="flex items-start gap-2.5 text-[14px] leading-snug" key={feat}>
							<span
								className={cn(
									"mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
									featured ? "bg-marigold/30 text-marigold" : "bg-oxblood/12 text-oxblood"
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
						featured && "border-marigold bg-marigold text-white hover:bg-marigold/90"
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

function SingleSessionCard() {
	return (
		<aside
			className="mx-auto mt-6 max-w-[1180px] overflow-hidden rounded-2xl border border-foreground/10 bg-gradient-to-br from-marigold/15 via-card to-card"
			id="sesion-unica"
		>
			<div className="grid items-center gap-6 p-7 md:grid-cols-12">
				<div className="md:col-span-7">
					<div className="flex items-center gap-2">
						<span className="rounded-full bg-marigold px-2.5 py-0.5 font-bold font-display text-[10px] text-white uppercase tracking-[0.14em]">
							Sin suscripción
						</span>
						<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.16em]">¿Probás antes?</span>
					</div>
					<h3 className="mt-3 font-bold font-display text-[1.5rem] text-foreground leading-[1.1] tracking-[-0.02em]">
						Sesión única — {SINGLE_SESSION.tagline}
					</h3>
					<p className="mt-2 max-w-[560px] text-[14px] text-foreground/70 leading-relaxed">{SINGLE_SESSION.body}</p>
				</div>

				<div className="flex items-center justify-between gap-4 md:col-span-4 md:col-start-9 md:flex-col md:items-end">
					<div className="text-right">
						<p className="flex items-baseline gap-1">
							<span className="font-bold font-display text-[1rem] text-oxblood leading-none">S/</span>
							<span className="numeral font-display font-extrabold text-[2.6rem] text-foreground leading-[0.85] tracking-[-0.04em]">
								{SINGLE_SESSION.priceSoles}
							</span>
						</p>
						<p className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">
							≈ ${SINGLE_SESSION.priceUsd} usd · {SINGLE_SESSION.duration}
						</p>
					</div>
					<a className={cn(buttonVariants({ size: "default" }), "shrink-0")} href="#planes">
						{SINGLE_SESSION.cta}
						<ArrowRightIcon weight="bold" />
					</a>
				</div>
			</div>
		</aside>
	);
}

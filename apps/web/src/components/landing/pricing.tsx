import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import { PLANS, type Plan, SINGLE_SESSION } from "./data";

export function Pricing() {
	return (
		<section className="px-6 py-32" id="planes">
			<Reveal>
				<header className="mx-auto mb-20 max-w-[1200px]">
					<span className="text-foreground/55 text-sm">Precios en soles</span>
					<h2 className="mt-4 max-w-[900px] font-bold font-display text-[clamp(2.4rem,5.6vw,4.5rem)] text-foreground leading-[0.98] tracking-[-0.04em]">
						Plan mensual o sesión única. Cancela cuando quieras.
					</h2>
					<p className="mt-6 max-w-[620px] text-[1.05rem] text-foreground/65 leading-[1.55]">
						Score CV gratis para siempre. Pro desde S/79. Premium si quieres acompañamiento hasta firmar.
					</p>
				</header>
			</Reveal>

			<div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-3">
				{PLANS.map((plan, idx) => (
					<Reveal delay={idx * 0.08} key={plan.id}>
						<PriceCard plan={plan} />
					</Reveal>
				))}
			</div>

			<SingleSessionCard />
		</section>
	);
}

function PriceCard({ plan }: { plan: Plan }) {
	const featured = plan.featured ?? false;
	const isFree = plan.priceSoles === 0;

	return (
		<div
			className={cn(
				"flex flex-col rounded-2xl border p-9 transition-transform duration-300 ease-out",
				featured
					? "border-transparent bg-foreground text-background hover:-translate-y-1.5 hover:scale-[1.02]"
					: "border-foreground/12 bg-card text-foreground hover:-translate-y-1 hover:border-foreground/25"
			)}
		>
			<div className="flex items-center justify-between">
				<h3 className="font-display font-semibold text-[1.6rem] tracking-[-0.025em]">{plan.name}</h3>
				{featured && (
					<span className="rounded-full bg-background/15 px-2.5 py-0.5 text-[11px] text-background/90">
						Más popular
					</span>
				)}
			</div>
			<p className={cn("mt-2 text-[14px] leading-[1.5]", featured ? "text-background/70" : "text-foreground/65")}>
				{plan.tagline}
			</p>

			<div className="mt-8 flex items-baseline gap-1.5">
				<span className={cn("font-medium text-base", featured ? "text-background/70" : "text-foreground/55")}>S/</span>
				<span className="font-bold font-display text-[3.4rem] tabular-nums leading-[0.85] tracking-[-0.04em]">
					{plan.priceSoles}
				</span>
				<span className={cn("ml-1 text-sm", featured ? "text-background/60" : "text-foreground/50")}>
					{isFree ? "" : "/ mes"}
				</span>
			</div>
			<p className={cn("mt-2 text-[13px]", featured ? "text-background/55" : "text-foreground/50")}>
				{isFree ? plan.per : `≈ US$${plan.priceUsd} · ${plan.per}`}
			</p>

			<div className={cn("my-7 h-px", featured ? "bg-background/15" : "bg-foreground/10")} />

			<ul className="flex flex-1 flex-col gap-3">
				{plan.features.map((feat) => (
					<li className="flex items-start gap-3 text-[14px] leading-[1.5]" key={feat}>
						<CheckIcon
							className={cn("mt-0.5 shrink-0", featured ? "text-background/80" : "text-foreground/65")}
							size={16}
							weight="bold"
						/>
						<span className={cn(featured ? "text-background/90" : "text-foreground/85")}>{feat}</span>
					</li>
				))}
			</ul>

			<a
				className={cn(
					buttonVariants({ size: "lg" }),
					"mt-10 w-full",
					featured && "bg-background text-foreground hover:bg-background/90"
				)}
				href="#planes"
			>
				{plan.cta}
				<ArrowRightIcon weight="bold" />
			</a>
		</div>
	);
}

function SingleSessionCard() {
	return (
		<aside
			className="mx-auto mt-6 max-w-[1200px] overflow-hidden rounded-2xl border border-foreground/10 bg-card"
			id="sesion-unica"
		>
			<div className="grid items-center gap-8 p-9 md:grid-cols-12">
				<div className="md:col-span-7">
					<h3 className="font-display font-semibold text-[1.6rem] text-foreground leading-[1.15] tracking-[-0.025em]">
						Sesión única — {SINGLE_SESSION.tagline}
					</h3>
					<p className="mt-3 max-w-[560px] text-[14px] text-foreground/65 leading-[1.55]">{SINGLE_SESSION.body}</p>
				</div>

				<div className="flex items-center justify-between gap-6 md:col-span-4 md:col-start-9 md:flex-col md:items-end md:text-right">
					<div>
						<p className="flex items-baseline gap-1.5">
							<span className="font-medium text-base text-foreground/55">S/</span>
							<span className="font-bold font-display text-[2.8rem] text-foreground tabular-nums leading-[0.85] tracking-[-0.04em]">
								{SINGLE_SESSION.priceSoles}
							</span>
						</p>
						<p className="mt-1 text-foreground/55 text-xs">
							≈ US${SINGLE_SESSION.priceUsd} · {SINGLE_SESSION.duration}
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

import { ArrowRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";
import { PLANS, type Plan, SINGLE_SESSION } from "./data";

const HEADLINE_FEATURE_COUNT = 4;

function featureDotColor(feature: string, featured: boolean): string {
	const f = feature.toLowerCase();
	if (f.includes("whatsapp")) {
		return featured ? "bg-emerald-400" : "bg-emerald-500";
	}
	if (
		f.includes("sesión") ||
		f.includes("coach") ||
		f.includes("revisión humana") ||
		f.includes("mapea") ||
		f.includes("domina") ||
		f.includes("cierra")
	) {
		return "bg-marigold";
	}
	if (f.includes("todo lo del plan")) {
		return featured ? "bg-background/40" : "bg-foreground/30";
	}
	return featured ? "bg-oxblood/90" : "bg-oxblood";
}

export function Pricing() {
	return (
		<section className="px-6 py-24" id="planes">
			<Reveal>
				<header className="mx-auto mb-14 max-w-[1200px]">
					<span className="font-mono text-[11px] text-foreground/70 uppercase tracking-[0.18em]">Precios en soles</span>
					<h2 className="mt-3 max-w-[820px] font-bold font-display text-[clamp(2rem,4.4vw,3.5rem)] text-foreground leading-[1.02] tracking-[-0.035em]">
						<WordReveal>Plan mensual o sesión única. Cancela cuando quieras.</WordReveal>
					</h2>
					<p className="mt-5 max-w-[580px] text-[1rem] text-foreground/65 leading-[1.55]">
						Score CV gratis para siempre. Pro desde S/79. Premium si quieres acompañamiento hasta firmar.
					</p>
				</header>
			</Reveal>

			<div className="mx-auto grid max-w-[1200px] grid-cols-1 items-stretch gap-4 md:grid-cols-3">
				{PLANS.map((plan, idx) => (
					<Reveal className="h-full" delay={idx * 0.08} key={plan.id}>
						<PriceCard plan={plan} />
					</Reveal>
				))}
			</div>

			<SingleSessionCard />

			<div className="mx-auto mt-16 max-w-[820px] border-foreground/8 border-t pt-14 text-center">
				<span
					aria-hidden="true"
					className="inline-block size-1.5 rounded-full bg-marigold shadow-[0_0_12px_oklch(from_var(--marigold)_l_c_h/0.6)]"
				/>
				<p className="mt-5 font-display-italic font-light text-[clamp(1.75rem,3.6vw,2.6rem)] text-foreground leading-[1.12] tracking-[-0.025em]">
					¿Encontraste trabajo?
				</p>
				<p className="mx-auto mt-5 max-w-[600px] text-balance text-[1.05rem] text-foreground/70 leading-[1.65]">
					No te preocupes, cancela cuando quieras. <span className="text-foreground/90">Siempre estaremos aquí</span>{" "}
					cuando quieras volver a desarrollar tu carrera.
				</p>
			</div>
		</section>
	);
}

function PriceCard({ plan }: { plan: Plan }) {
	const featured = plan.featured ?? false;
	const isFree = plan.priceSoles === 0;

	return (
		<div
			className={cn(
				"flex h-full flex-col rounded-2xl border p-9 transition-transform duration-300 ease-out",
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
				<span className={cn("font-medium text-base", featured ? "text-background/80" : "text-foreground/70")}>S/</span>
				<span className="font-bold font-display text-[3.4rem] tabular-nums leading-[0.85] tracking-[-0.04em]">
					{plan.priceSoles}
				</span>
				<span className={cn("ml-1 text-sm", featured ? "text-background/60" : "text-foreground/70")}>
					{isFree ? "" : "/ mes"}
				</span>
			</div>
			<p className={cn("mt-2 text-[13px]", featured ? "text-background/55" : "text-foreground/70")}>
				{isFree ? plan.per : `≈ US$${plan.priceUsd} · ${plan.per}`}
			</p>

			<div className={cn("my-7 h-px", featured ? "bg-background/15" : "bg-foreground/10")} />

			<div className="flex flex-1 flex-col">
				<ul className="flex flex-col gap-3">
					{plan.features.slice(0, HEADLINE_FEATURE_COUNT).map((feat) => (
						<FeatureItem feature={feat} featured={featured} key={feat} />
					))}
				</ul>

				{plan.features.length > HEADLINE_FEATURE_COUNT && (
					<details className="group/expand mt-3">
						<summary
							className={cn(
								"flex cursor-pointer list-none items-center gap-1.5 font-medium text-[12.5px] transition-colors",
								featured ? "text-background/60 hover:text-background/90" : "text-foreground/70 hover:text-foreground"
							)}
						>
							<CaretDownIcon
								className="transition-transform duration-200 group-open/expand:rotate-180"
								size={12}
								weight="bold"
							/>
							<span className="group-open/expand:hidden">+ {plan.features.length - HEADLINE_FEATURE_COUNT} más</span>
							<span className="hidden group-open/expand:inline">Ocultar</span>
						</summary>
						<ul className="mt-3 flex flex-col gap-3">
							{plan.features.slice(HEADLINE_FEATURE_COUNT).map((feat) => (
								<FeatureItem feature={feat} featured={featured} key={feat} />
							))}
						</ul>
					</details>
				)}
			</div>

			<a
				className={cn(
					buttonVariants({ size: "lg" }),
					"mt-8 w-full",
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

function FeatureItem({ feature, featured }: { feature: string; featured: boolean }) {
	return (
		<li className="flex items-start gap-3 text-[14px] leading-[1.5]">
			<span
				aria-hidden="true"
				className={cn("mt-[7px] block size-1.5 shrink-0 rounded-full", featureDotColor(feature, featured))}
			/>
			<span className={cn(featured ? "text-background/90" : "text-foreground/85")}>{feature}</span>
		</li>
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
						Sesión única: {SINGLE_SESSION.tagline}
					</h3>
					<p className="mt-3 max-w-[560px] text-[14px] text-foreground/65 leading-[1.55]">{SINGLE_SESSION.body}</p>
				</div>

				<div className="flex items-center justify-between gap-6 md:col-span-4 md:col-start-9 md:flex-col md:items-end md:text-right">
					<div>
						<p className="flex items-baseline gap-1.5">
							<span className="font-medium text-base text-foreground/70">S/</span>
							<span className="font-bold font-display text-[2.8rem] text-foreground tabular-nums leading-[0.85] tracking-[-0.04em]">
								{SINGLE_SESSION.priceSoles}
							</span>
						</p>
						<p className="mt-1 text-foreground/70 text-xs">
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

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ComparisonRow, PLAN_COMPARISON, PLANS } from "@/components/landing/data";
import { Faq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/footer";
import { SingleSessionStrip } from "@/components/landing/pricing";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
	head: () => ({
		meta: [
			{ title: "Planes y precios · ASSENDIA" },
			{
				name: "description",
				content:
					"Planes de ASSENDIA en soles: Gratuito, Pro y Premium. Coaching 1:1, herramientas de IA sin límite y garantía de entrevista en 90 días. Sin permanencia, cancelas cuando quieras.",
			},
		],
	}),
});

function PricingPage() {
	return (
		<div className="relative isolate overflow-x-clip bg-background">
			<PricingTopBar />
			<main>
				<PricingPageHero />

				<PlanComparison />
				<SingleSessionStrip location="page" />
				<Faq />
			</main>
			<LandingFooter />
		</div>
	);
}

function PricingTopBar() {
	return (
		<header className="sticky top-2 z-50 mx-auto w-full max-w-7xl px-4">
			<nav className="flex items-center gap-2 rounded-full border border-border bg-card/60 py-1.5 pr-1 pl-2 backdrop-blur-md">
				<Link className="flex shrink-0 items-center gap-2 pr-3 text-foreground tracking-tight" to="/">
					<img
						alt="ASSENDIA"
						className="size-8 rounded-lg object-cover"
						height={32}
						src="/assendia-logo.png"
						width={32}
					/>
					<span className="font-display text-base leading-none tracking-tight">ASSENDIA</span>
				</Link>

				<Link
					className="group ml-1 hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-foreground/60 text-sm transition-colors hover:text-foreground sm:inline-flex"
					to="/"
				>
					<ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" weight="bold" />
					Volver al inicio
				</Link>

				<div className="ml-auto flex items-center gap-1.5">
					<Link
						className="hidden rounded-full px-3 py-1.5 font-medium text-foreground/65 text-sm transition-colors hover:text-foreground sm:inline-flex"
						to="/login"
					>
						Iniciar sesión
					</Link>
					<Link className={buttonVariants({ size: "sm", className: "rounded-full!" })} to="/login">
						Empezar gratis
						<ArrowRightIcon weight="bold" />
					</Link>
				</div>
			</nav>
		</header>
	);
}

function PricingPageHero() {
	return (
		<section className="px-6 pt-24">
			<div className="mx-auto max-w-7xl">
				<Reveal>
					<span className="block font-mono text-oxblood text-xs uppercase">Planes y precios</span>
				</Reveal>
				<h1 className="mt-4 max-w-[16ch] font-display text-6xl text-foreground leading-[0.92] tracking-tighter sm:text-7xl">
					<WordReveal>Elige el plan que te lleva a la entrevista.</WordReveal>
				</h1>
				<Reveal delay={0.2}>
					<p className="mt-6 max-w-2xl text-balance text-base text-foreground/65 leading-relaxed">
						Precios en soles, sin permanencia y cancelas cuando quieras. Todos los planes pagados incluyen las
						herramientas de IA sin límite; Premium añade el acompañamiento humano completo con garantía de entrevista en
						90 días.
					</p>
				</Reveal>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Feature-by-feature table. Columns align to PLANS order; the featured plan's
// column is tinted so the eye tracks it down the rows.
// ---------------------------------------------------------------------------
function PlanComparison() {
	return (
		<section className="px-6 pt-16 pb-20" id="comparativa">
			<div className="mx-auto max-w-7xl">
				<div className="overflow-x-auto rounded-3xl border border-white/10">
					<table className="w-full min-w-160 border-collapse text-left">
						<caption className="sr-only">Comparativa de características por plan</caption>
						<thead>
							<tr className="border-white/10 border-b">
								<th className="px-6 py-6 font-normal text-foreground/55 text-xs uppercase tracking-wide" scope="col">
									Característica
								</th>
								{PLANS.map((plan) => (
									<th
										className={cn("px-6 py-6 text-center align-bottom font-normal", plan.featured && "bg-oxblood/8")}
										key={plan.id}
										scope="col"
									>
										<span className="block font-display text-foreground text-xl tracking-tight">{plan.name}</span>
										<span className="block text-foreground/60 text-lg">
											{plan.priceSoles === 0 ? "S/ 0 al mes" : `S/ ${plan.priceSoles} al mes`}
										</span>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{PLAN_COMPARISON.map((row) => (
								<ComparisonRowCells key={row.label} row={row} />
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}

function ComparisonRowCells({ row }: { row: ComparisonRow }) {
	return (
		<tr className="border-white/8 border-b last:border-b-0">
			<th className="px-6 py-5 text-left font-normal text-foreground/80 text-sm" scope="row">
				{row.label}
			</th>
			{PLANS.map((plan, i) => (
				<td className={cn("px-6 py-5 text-center align-middle", plan.featured && "bg-oxblood/8")} key={plan.id}>
					<ComparisonCell value={row.values[i] ?? false} />
				</td>
			))}
		</tr>
	);
}

function ComparisonCell({ value }: { value: string | boolean }) {
	if (typeof value === "boolean") {
		return value ? (
			<span className="mx-auto inline-flex size-5 items-center justify-center rounded-full bg-oxblood/15 text-oxblood">
				<CheckIcon size={13} weight="regular" />
			</span>
		) : (
			<MinusIcon aria-label="No incluido" className="mx-auto text-foreground/30" size={16} weight="regular" />
		);
	}
	return <span className="text-foreground/80 text-sm">{value}</span>;
}

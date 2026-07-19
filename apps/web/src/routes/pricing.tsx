import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { type ComparisonRow, PLAN_COMPARISON, PLANS } from "@/components/landing/data";
import { Faq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/footer";
import { SingleSessionStrip } from "@/components/landing/pricing";
import { SubpageTopBar } from "@/components/landing/subpage-top-bar";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { breadcrumbJsonLd, SITE_URL, seoHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PATH = "/pricing";
const TITLE = "Planes y precios en soles · ASSENDIA";
const DESCRIPTION =
	"Planes de ASSENDIA en soles: Gratuito, Pro (S/79) y Premium (S/179). Coaching 1:1, herramientas de IA sin límite y garantía de entrevista en 90 días. Sin permanencia.";

const seo = seoHead({ title: TITLE, description: DESCRIPTION, path: PATH });

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Service",
			"@id": `${SITE_URL}${PATH}#service`,
			name: "Assendia | Coaching laboral y CV con IA",
			provider: { "@id": `${SITE_URL}#organization` },
			areaServed: "Latinoamérica",
			serviceType: "Coaching laboral, optimización de CV, LinkedIn y preparación para entrevistas",
			offers: PLANS.map((plan) => ({
				"@type": "Offer",
				name: `ASSENDIA ${plan.name}`,
				description: plan.tagline,
				price: plan.priceSoles.toFixed(2),
				priceCurrency: "PEN",
				availability: "https://schema.org/InStock",
				url: `${SITE_URL}${PATH}`,
			})),
		},
		breadcrumbJsonLd("Planes y precios", PATH),
	],
};

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
	head: () => ({
		meta: seo.meta,
		links: seo.links,
		scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData) }],
	}),
});

function PricingPage() {
	return (
		<div className="relative isolate overflow-x-clip bg-background">
			<SubpageTopBar />
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

function PricingPageHero() {
	return (
		<section className="px-6 pt-24">
			<div className="mx-auto max-w-7xl">
				<h1 className="max-w-[16ch] font-display text-6xl text-foreground leading-[0.92] tracking-tighter sm:text-7xl">
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

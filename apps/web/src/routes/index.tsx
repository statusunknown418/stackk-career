import { createFileRoute } from "@tanstack/react-router";
import { BentoGrid } from "@/components/landing/bento-grid";
import { FAQ_ITEMS, PLANS } from "@/components/landing/data";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { StatsAccumulation } from "@/components/landing/stats-accumulation";
import { TestimonialsCarousel } from "@/components/landing/testimonials-carousel";
import { AuroraBackground } from "@/components/ui/aurora-background";

const SITE_URL = "https://impulsa.com";
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
const SITE_NAME = "IMPULSA";
const TITLE = "IMPULSA · Garantizamos tu próxima entrevista en menos de 3 meses";
const DESCRIPTION =
	"IA que reescribe tu CV en 30 segundos + coach senior que te prepara para destacar en cada entrevista. Con Premium: entrevista en 90 días o te devolvemos el 100%. Score gratis, sin tarjeta. Hecho para LATAM.";

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Organization",
			"@id": `${SITE_URL}#organization`,
			name: SITE_NAME,
			url: SITE_URL,
			logo: `${SITE_URL}/logo.png`,
			description: "Plataforma de empleo con IA + coaching humano para LATAM.",
			areaServed: ["PE", "CO", "MX", "AR", "CL", "UY", "EC", "ES"],
			foundingLocation: { "@type": "Place", name: "Lima, Perú" },
		},
		{
			"@type": "WebSite",
			"@id": `${SITE_URL}#website`,
			url: SITE_URL,
			name: SITE_NAME,
			description: DESCRIPTION,
			inLanguage: "es",
			publisher: { "@id": `${SITE_URL}#organization` },
		},
		{
			"@type": "Service",
			"@id": `${SITE_URL}#service`,
			name: "IMPULSA · Coaching de carrera con IA",
			provider: { "@id": `${SITE_URL}#organization` },
			areaServed: "LATAM",
			serviceType: "Career coaching, CV optimization, LinkedIn optimization, interview preparation",
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: "4.9",
				reviewCount: "380",
				bestRating: "5",
				worstRating: "1",
			},
			offers: PLANS.map((plan) => ({
				"@type": "Offer",
				name: `IMPULSA ${plan.name}`,
				description: plan.tagline,
				price: plan.priceSoles.toFixed(2),
				priceCurrency: "PEN",
				availability: "https://schema.org/InStock",
				url: `${SITE_URL}/#planes`,
			})),
		},
		{
			"@type": "FAQPage",
			"@id": `${SITE_URL}#faq`,
			mainEntity: FAQ_ITEMS.map((item) => ({
				"@type": "Question",
				name: item.q,
				acceptedAnswer: {
					"@type": "Answer",
					text: item.a,
				},
			})),
		},
	],
};

export const Route = createFileRoute("/")({
	component: LandingPage,
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			{ name: "robots", content: "index, follow" },
			{ name: "author", content: SITE_NAME },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: SITE_URL },
			{ property: "og:image", content: OG_IMAGE_URL },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: TITLE },
			{ property: "og:locale", content: "es_PE" },
			{ property: "og:locale:alternate", content: "es_MX" },
			{ property: "og:locale:alternate", content: "es_AR" },
			{ property: "og:locale:alternate", content: "es_CO" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: TITLE },
			{ name: "twitter:description", content: DESCRIPTION },
			{ name: "twitter:image", content: OG_IMAGE_URL },
			{ name: "twitter:image:alt", content: TITLE },
			{ name: "theme-color", content: "#0a0a0a" },
		],
		links: [
			{ rel: "canonical", href: SITE_URL },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:ital,wght@0,100..900;1,100..900&family=JetBrains+Mono:wght@400;500&display=swap",
			},
		],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(structuredData),
			},
		],
	}),
});

function LandingPage() {
	return (
		<div className="relative isolate overflow-x-clip">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[100vh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
			>
				<AuroraBackground />
			</div>
			<LandingNav />
			<main className="-mt-16">
				<Hero />
				<StatsAccumulation />
				<BentoGrid />
				<HowItWorks />
				<TestimonialsCarousel />
				<Pricing />
				<Faq />
				<FinalCta />
			</main>
			<LandingFooter />
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { BentoGrid } from "@/components/landing/bento-grid";
import { FAQ_ITEMS, PLANS } from "@/components/landing/data";
import { Faq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/footer";
import { FounderMessage } from "@/components/landing/founder-message";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { Tools } from "@/components/landing/tools";

const SITE_URL = "https://assendia.com";
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
const SITE_NAME = "ASSENDIA";
const TITLE = "Assendia | Mejora tu CV con IA y coaching laboral";
const DESCRIPTION =
	"Mejora tu CV con IA, recibe un score en minutos y prepárate con coaching laboral 1:1. Gratis para empezar, creado para profesionales de LATAM.";

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "Organization",
			"@id": `${SITE_URL}#organization`,
			name: SITE_NAME,
			url: SITE_URL,
			logo: `${SITE_URL}/assendia-logo.png`,
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
			inLanguage: "es-419",
			publisher: { "@id": `${SITE_URL}#organization` },
		},
		{
			"@type": "Service",
			"@id": `${SITE_URL}#service`,
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
			// Fonts are self-hosted via @fontsource (see index.css) — no external
			// Google Fonts request, so no render-blocking stylesheet or preconnects.
			{ rel: "canonical", href: SITE_URL },
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
			<LandingNav />
			<main>
				<Hero />
				<Tools />
				<BentoGrid />
				<HowItWorks />
				{/*<TestimonialsCarousel />*/}
				<FounderMessage />
				<Pricing />
				<Faq />
			</main>
			<LandingFooter />
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { BentoGrid } from "@/components/landing/bento-grid";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";
import { Guarantee } from "@/components/landing/guarantee";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingNav } from "@/components/landing/nav";
import { Pricing } from "@/components/landing/pricing";
import { TestimonialsCarousel } from "@/components/landing/testimonials-carousel";

export const Route = createFileRoute("/")({
	component: LandingPage,
	head: () => ({
		meta: [
			{
				title: "STACKCV — Tu CV merece una conversación",
			},
			{
				name: "description",
				content:
					"Mentorías 1:1 de CV, LinkedIn y estrategia de carrera para recién graduados de LatAm. Diagnóstico gratis, sin tarjeta.",
			},
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap",
			},
		],
	}),
});

function LandingPage() {
	return (
		<div className="relative">
			<LandingNav />
			<main>
				<Hero />
				<BentoGrid />
				<HowItWorks />
				<Pricing />
				<Guarantee />
				<TestimonialsCarousel />
				<Faq />
				<FinalCta />
			</main>
			<LandingFooter />
		</div>
	);
}

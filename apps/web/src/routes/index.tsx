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
				title: "IMPULSA — Tu carrera, sin techo de cristal",
			},
			{
				name: "description",
				content:
					"Plataforma de empleo con IA + Coaching humano para LATAM. Score tu CV, optimizá tu LinkedIn, hablá con un coach peruano senior. Score gratis, sin tarjeta.",
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
				href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Inter:ital,wght@0,100..900;1,100..900&family=JetBrains+Mono:wght@400;500&display=swap",
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

import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { LogoMarqueeRows } from "@/components/ui/logo-marquee-rows";
import Strands from "../strands";
import { AssendiaEditorPreview } from "./product-showcase";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

const focusRing = "focus-visible:outline-2 focus-visible:outline-oxblood focus-visible:outline-offset-4";

export function Hero() {
	const prefersReducedMotion = useReducedMotion();
	const motionDisabled = prefersReducedMotion ?? false;

	const fadeUp = motionDisabled ? false : { opacity: 0, y: 28 };
	const fadeIn = motionDisabled ? undefined : { opacity: 1, y: 0 };
	const viewport = { once: true, margin: "-12% 0px" } as const;

	return (
		<>
			<section className="relative isolate flex min-h-dvh px-4 pt-24 pb-14 text-foreground sm:px-6 lg:pt-24" id="top">
				<div className="mask-[linear-gradient(to_bottom,black_0%,black_50%,transparent_90%)] pointer-events-none absolute inset-0 -top-14 z-0 [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_50%,transparent_90%)]">
					<Strands
						amplitude={1.5}
						colors={["#F97316", "#7C3AED", "#06B6D4"]}
						count={4}
						dispersion={1}
						glass={false}
						glassSize={1}
						glow={2}
						hueShift={0}
						intensity={0.6}
						opacity={0.5}
						refraction={1}
						saturation={2}
						scale={1.5}
						speed={0.3}
						spread={1}
						taper={3}
						thickness={0.7}
						waviness={1}
					/>
				</div>

				<div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-start text-left">
					<div className="flex max-w-5xl flex-col items-start">
						<motion.h1
							className="max-w-4xl text-balance font-display text-7xl leading-none tracking-[-0.07em] sm:text-8xl"
							initial={fadeUp}
							transition={{ duration: 0.8, ease: EASE_OUT_QUINT, delay: 0.14 }}
							viewport={viewport}
							whileInView={fadeIn}
						>
							Postula mejor. Llega antes.
						</motion.h1>

						<motion.div
							className="mt-7"
							initial={fadeUp}
							transition={{ duration: 0.72, ease: EASE_OUT_QUINT, delay: 0.24 }}
							viewport={viewport}
							whileInView={fadeIn}
						>
							<p className="max-w-2xl text-pretty text-foreground/80 text-lg leading-relaxed sm:text-xl">
								Utiliza Assendia para reescribir tu CV, puntuar cada versión y acceder a coaching humano hasta tu
								primera entrevista.
							</p>
						</motion.div>

						<motion.div
							className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-start"
							initial={fadeUp}
							transition={{ duration: 0.72, ease: EASE_OUT_QUINT, delay: 0.32 }}
							viewport={viewport}
							whileInView={fadeIn}
						>
							<Link
								aria-label="Analiza mi CV gratis"
								className={`inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-medium text-primary-foreground shadow-cta transition duration-500 ease-out hover:-translate-y-0.5 hover:shadow-cta-hover ${focusRing}`}
								to="/login"
							>
								<span>Analiza mi CV gratis</span>
							</Link>

							<Link
								className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-foreground/20 px-8 font-medium text-foreground transition duration-500 ease-out hover:-translate-y-0.5 hover:border-foreground/40 hover:bg-foreground/5 ${focusRing}`}
								to="/pricing"
							>
								Ver planes
								<ArrowRightIcon className="opacity-70 transition-transform duration-500 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
							</Link>
						</motion.div>
					</div>

					<div className="mt-10 w-full sm:mt-16">
						<IntegratedProductHeroVisual reducedMotion={motionDisabled} viewport={viewport} />
					</div>
				</div>
			</section>

			<section className="px-6 py-12 sm:pb-16">
				<div className="flex w-full flex-col items-center gap-6">
					<p className="text-foreground/50 text-xs uppercase">Nuestros talentos ya trabajan en</p>
					<LogoMarqueeRows />
				</div>
			</section>
		</>
	);
}

function IntegratedProductHeroVisual({
	reducedMotion,
	viewport,
}: {
	reducedMotion: boolean;
	viewport: { once: true; margin: string };
}) {
	return (
		<motion.aside
			aria-label="Dentro de Assendia: vista previa del editor de CV"
			className="relative w-full"
			initial={reducedMotion ? false : { opacity: 0, y: 40 }}
			transition={{ duration: 1, ease: EASE_OUT_QUINT, delay: 0.4 }}
			viewport={viewport}
			whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
		>
			<AssendiaEditorPreview />
		</motion.aside>
	);
}

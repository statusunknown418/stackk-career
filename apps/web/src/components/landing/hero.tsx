import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { LogoMarqueeRows } from "@/components/ui/logo-marquee-rows";
import { useMediaQuery } from "@/hooks/use-media-query";
import Strands from "../strands";
import { AssendiaEditorPreview } from "./product-showcase";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

const focusRing = "focus-visible:outline-2 focus-visible:outline-oxblood focus-visible:outline-offset-4";

export function Hero() {
	const prefersReducedMotion = useReducedMotion();
	const isDesktop = useMediaQuery("md");
	const motionDisabled = Boolean(prefersReducedMotion) || !isDesktop;

	const fadeUp = motionDisabled ? false : { opacity: 0, y: 28 };
	const fadeIn = motionDisabled ? undefined : { opacity: 1, y: 0 };
	const viewport = { once: true, margin: "-12% 0px" } as const;

	return (
		<>
			<section
				className="relative isolate flex min-h-dvh scroll-mt-24 px-4 pt-16 pb-12 text-foreground sm:px-6 sm:pt-20 sm:pb-14 lg:pt-24"
				id="top"
			>
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
							className="max-w-4xl text-balance font-display text-[clamp(3.2rem,17vw,4.25rem)] leading-[0.94] tracking-[-0.065em] sm:text-8xl sm:leading-none"
							initial={fadeUp}
							transition={{ duration: 0.8, ease: EASE_OUT_QUINT, delay: 0.14 }}
							viewport={viewport}
							whileInView={fadeIn}
						>
							Mejora tu CV. Llega antes.
						</motion.h1>

						<motion.div
							className="mt-6"
							initial={fadeUp}
							transition={{ duration: 0.72, ease: EASE_OUT_QUINT, delay: 0.24 }}
							viewport={viewport}
							whileInView={fadeIn}
						>
							<p className="max-w-2xl text-pretty text-base text-foreground/80 leading-relaxed sm:text-xl">
								Reescribe tu CV, mejora cada versión y recibe coaching humano hasta tu primera entrevista.
							</p>
						</motion.div>

						<motion.div
							className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-start sm:gap-4"
							initial={fadeUp}
							transition={{ duration: 0.72, ease: EASE_OUT_QUINT, delay: 0.32 }}
							viewport={viewport}
							whileInView={fadeIn}
						>
							<Link
								aria-label="Analiza mi CV gratis"
								className={`inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-8 font-medium text-primary-foreground shadow-cta transition duration-500 ease-out hover:-translate-y-0.5 hover:shadow-cta-hover sm:w-auto ${focusRing}`}
								to="/login"
							>
								<span>Analiza mi CV gratis</span>
							</Link>

							<Link
								className={`group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-foreground/20 px-8 font-medium text-foreground transition duration-500 ease-out hover:-translate-y-0.5 hover:border-foreground/40 hover:bg-foreground/5 sm:w-auto ${focusRing}`}
								to="/pricing"
							>
								Ver planes
								<ArrowRightIcon className="opacity-70 transition-transform duration-500 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
							</Link>
						</motion.div>
					</div>

					<div className="mt-8 w-full sm:mt-16">
						<IntegratedProductHeroVisual reducedMotion={motionDisabled} viewport={viewport} />
					</div>
				</div>
			</section>

			<section className="px-4 py-10 sm:px-6 sm:pb-16">
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

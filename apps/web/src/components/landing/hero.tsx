import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { LogoMarqueeRows } from "@/components/ui/logo-marquee-rows";
import { Button } from "../ui/button";
import { HeroAuroraShader } from "./hero-aurora-shader";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

export function Hero() {
	const prefersReducedMotion = useReducedMotion();
	const motionDisabled = prefersReducedMotion ?? false;

	const fadeUp = motionDisabled ? false : { opacity: 0, y: 24 };
	const fadeIn = motionDisabled ? undefined : { opacity: 1, y: 0 };
	const viewport = { once: true, margin: "-10% 0px" } as const;

	return (
		<>
			<section
				className="relative isolate flex min-h-[95vh] flex-col items-center justify-center overflow-hidden bg-background px-6 pt-24 pb-20 sm:pb-24"
				id="top"
			>
				<HeroAuroraShader />

				<div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
					{/* Headline */}
					<motion.h1
						className="text-balance font-display text-5xl leading-none tracking-tighter md:text-7xl"
						initial={fadeUp}
						transition={{ duration: 0.8, ease: EASE_OUT_QUINT, delay: 0.1 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						Tu próxima entrevista en menos de{" "}
						<span className="relative inline-block whitespace-nowrap text-oxblood">3 meses</span>
					</motion.h1>

					{/* Subheadline */}
					<motion.p
						className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground leading-tight"
						initial={fadeUp}
						transition={{ duration: 0.7, ease: EASE_OUT_QUINT, delay: 0.2 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						Tu CV hecho con ayuda de Casey (AI) y afinado por un coach 1:1 senior que ya pasó por lo mismo. Contigo en
						cada etapa hasta la entrevista.
					</motion.p>

					{/* CTAs */}
					<motion.div
						className="mt-6 flex flex-col items-center gap-4 sm:flex-row"
						initial={fadeUp}
						transition={{ duration: 0.7, ease: EASE_OUT_QUINT, delay: 0.3 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						<Button className="rounded-full" render={<Link to="/waitlist" />} size="lg">
							<span className="relative z-10 flex items-center gap-2">
								Analiza mi CV gratis
								<span className="flex items-center justify-center rounded-full bg-neutral-950/10 px-2.5 py-0.5 font-bold text-neutral-950 text-xs">
									Muy pronto
								</span>
							</span>
						</Button>

						<a
							className="group inline-flex h-10 items-center justify-center gap-2 rounded-full px-6 font-medium text-muted-foreground transition-colors hover:text-foreground"
							href="#planes"
						>
							Ver planes
							<ArrowRightIcon className="transition-transform duration-300 group-hover:translate-x-1" weight="bold" />
						</a>
					</motion.div>

					{/* The Core Proof */}
					<motion.div
						className="mt-16 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-[auto_auto]"
						initial="hidden"
						transition={{ staggerChildren: 0.1, delayChildren: 0.5 }}
						viewport={viewport}
						whileInView="visible"
					>
						<OutcomeCard className="sm:col-span-2 lg:col-span-6 lg:row-span-2" reducedMotion={motionDisabled}>
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="font-medium text-foreground/60 text-xs uppercase">
										Puntaje CV <span className="text-foreground/30">/ 100</span>
									</p>
									<p className="mt-3 max-w-[18ch] font-display text-foreground text-xl leading-tight tracking-tight">
										De borrador genérico a CV listo para reclutador.
									</p>
								</div>
							</div>

							<div className="mt-10 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
								<div>
									<div className="flex items-baseline justify-center gap-1 text-5xl">
										<span className="font-display font-medium text-foreground/25 tabular-nums leading-none">46</span>
										<ArrowRightIcon className="text-foreground/35" size={20} weight="bold" />
										<span className="font-display text-foreground tabular-nums">95</span>
									</div>

									<div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/20">
										<motion.div
											className="h-full origin-left rounded-full bg-oxblood"
											initial={motionDisabled ? false : { scaleX: 0 }}
											transition={{ duration: 1.2, ease: EASE_OUT_QUINT, delay: 0.82 }}
											viewport={viewport}
											whileInView={motionDisabled ? undefined : { scaleX: 1 }}
										/>
									</div>

									<div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
										<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
											<p className="text-foreground/40 text-xs uppercase">Antes</p>
											<p className="mt-2 text-foreground/55 leading-snug">
												Responsabilidades sueltas, sin impacto ni palabras clave.
											</p>
										</div>
										<div className="rounded-2xl border border-oxblood/25 bg-oxblood/10 p-3">
											<p className="text-oxblood text-xs uppercase">Después</p>
											<p className="mt-2 text-foreground/70 leading-snug">
												Logros medibles, tono propio y lectura rápida para ATS.
											</p>
										</div>
									</div>
								</div>
							</div>
						</OutcomeCard>

						<OutcomeCard className="sm:col-span-2 lg:col-span-6" reducedMotion={motionDisabled}>
							<div className="flex items-start justify-between gap-5">
								<div>
									<p className="font-medium font-mono text-foreground/55 text-xs uppercase">Coach 1:1 + Casey AI</p>
									<p className="mt-3 max-w-[16ch] font-display text-foreground text-xl leading-none tracking-tight">
										Feedback humano personalizado
									</p>
								</div>
								<div aria-hidden="true" className="flex -space-x-2 pt-1">
									<span className="grid size-10 place-items-center rounded-full border border-background bg-oxblood text-background text-xs">
										SR
									</span>
									<span className="grid size-10 place-items-center rounded-full border border-background bg-foreground/12 text-foreground/70 text-xs">
										AI
									</span>
								</div>
							</div>
							<div aria-hidden="true" className="mt-6 grid gap-2">
								<span className="block w-11/12 rounded-2xl rounded-tl-sm bg-foreground/8 px-4 py-3">
									<span className="block h-1.5 w-44 max-w-full rounded-full bg-foreground/20" />
									<span className="mt-2 block h-1.5 w-28 rounded-full bg-foreground/14" />
								</span>
								<span className="ml-auto block w-10/12 rounded-2xl rounded-tr-sm bg-oxblood/12 px-4 py-3">
									<span className="block h-1.5 w-36 max-w-full rounded-full bg-oxblood/55" />
									<span className="mt-2 block h-1.5 w-20 rounded-full bg-oxblood/35" />
								</span>
							</div>
						</OutcomeCard>

						<OutcomeCard className="lg:col-span-3" reducedMotion={motionDisabled}>
							<p className="font-medium font-mono text-foreground/55 text-xs uppercase">Primera entrevista</p>
							<p className="mt-4 font-display text-4xl text-foreground tabular-nums leading-none tracking-tighter">
								18
								<span className="ml-2 text-foreground/45 text-lg tracking-tight">días</span>
							</p>
							<div aria-hidden="true" className="mt-6 grid grid-cols-6 gap-1.5">
								<span className="h-2 rounded-full bg-foreground/10" />
								<span className="h-2 rounded-full bg-foreground/10" />
								<span className="h-2 rounded-full bg-foreground/10" />
								<span className="h-2 rounded-full bg-foreground/10" />
								<span className="h-2 rounded-full bg-foreground/10" />
								<span className="h-2 rounded-full bg-foreground/10" />
								<span className="h-2 rounded-full bg-foreground/10" />
								<span className="h-2 rounded-full bg-oxblood/35" />
								<span className="h-2 rounded-full bg-oxblood/35" />
								<span className="h-2 rounded-full bg-oxblood" />
								<span className="h-2 rounded-full bg-oxblood" />
								<span className="h-2 rounded-full bg-oxblood" />
							</div>
							<p className="mt-5 text-foreground/60 text-sm leading-snug">
								Promedio desde CV reescrito hasta primera llamada.
							</p>
						</OutcomeCard>

						<OutcomeCard className="lg:col-span-3" reducedMotion={motionDisabled}>
							<p className="font-medium font-mono text-foreground/55 text-xs uppercase">Inversión clara</p>
							<p className="mt-4 font-display text-3xl text-foreground tabular-nums leading-none tracking-tighter">
								S/79
								<span className="ml-2 font-medium text-base text-foreground/45 tracking-tight">/mes</span>
							</p>
							<div
								aria-hidden="true"
								className="mt-6 space-y-3 rounded-2xl border border-border/70 bg-background/45 p-3"
							>
								<div className="flex items-center justify-between gap-3">
									<span className="h-1.5 w-20 rounded-full bg-foreground/15" />
									<span className="h-1.5 w-10 rounded-full bg-oxblood/60" />
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="h-1.5 w-14 rounded-full bg-foreground/10" />
									<span className="h-1.5 w-8 rounded-full bg-foreground/14" />
								</div>
							</div>
						</OutcomeCard>
					</motion.div>
				</div>
			</section>

			{/* Unhidden & Polished Stats Section */}
			<section className="relative bg-linear-to-t from-muted/20 px-6 pb-12 sm:pb-16">
				<div className="flex w-full flex-col items-center gap-6">
					<p className="text-foreground/50 text-xs uppercase">Nuestros talentos ya trabajan en</p>
					<LogoMarqueeRows />
				</div>
			</section>
		</>
	);
}

const outcomeCardVariants = {
	hidden: { opacity: 0, y: 18, scale: 0.98 },
	visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE_OUT_QUINT } },
};

function OutcomeCard({
	children,
	reducedMotion,
	className = "",
}: {
	children: ReactNode;
	className?: string;
	reducedMotion: boolean;
}) {
	return (
		<motion.article
			className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-colors duration-300 hover:border-oxblood/40 sm:p-6 ${className}`}
			variants={reducedMotion ? undefined : outcomeCardVariants}
			whileHover={reducedMotion ? undefined : { y: -4 }}
		>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -top-24 -right-20 size-48 rounded-full bg-oxblood/10 blur-xl transition-opacity duration-500 group-hover:opacity-90"
			/>
			<div className="relative z-10 flex flex-col">{children}</div>
		</motion.article>
	);
}

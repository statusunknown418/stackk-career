import { ArrowRightIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";
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
				className="relative isolate flex min-h-[95vh] flex-col items-center justify-center overflow-hidden bg-background px-6 pt-20 pb-20 sm:pb-24 md:pt-32"
				id="top"
			>
				<HeroAuroraShader />

				<div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
					{/* Headline */}
					<motion.h1
						className="text-balance font-display font-medium text-6xl tracking-tighter"
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
						className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground"
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
						className="mt-5 flex flex-col items-center gap-4 sm:flex-row"
						initial={fadeUp}
						transition={{ duration: 0.7, ease: EASE_OUT_QUINT, delay: 0.3 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						<Button className="rounded-full" render={<Link to="/waitlist" />} size="lg">
							<span className="relative z-10 flex items-center gap-2">
								Analiza mi CV gratis
								<span className="flex items-center justify-center rounded-full bg-neutral-950/10 px-2.5 py-0.5 font-bold text-[10px] text-neutral-950 uppercase tracking-wider backdrop-blur-md">
									Muy pronto
								</span>
							</span>
						</Button>

						<a
							className="group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-medium text-foreground/70 transition-colors hover:text-foreground"
							href="#planes"
						>
							Ver planes
							<ArrowRightIcon className="transition-transform duration-300 group-hover:translate-x-1" weight="bold" />
						</a>
					</motion.div>

					{/* Micro Trust Pills */}
					<motion.div
						className="mt-6 flex items-center justify-center gap-4 font-medium font-mono text-[11px] text-foreground/50 uppercase"
						initial={fadeUp}
						transition={{ duration: 0.7, ease: EASE_OUT_QUINT, delay: 0.4 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						<span className="flex items-center gap-1.5">
							<ShieldCheckIcon className="text-oxblood" size={14} weight="fill" /> Garantía 90 días
						</span>
						<span aria-hidden="true" className="size-1 rounded-full bg-foreground/20" />
						<span>Cancelas cuando quieras</span>
					</motion.div>

					{/* The Core Proof */}
					<motion.div
						className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2"
						initial="hidden"
						transition={{ staggerChildren: 0.09, delayChildren: 0.48 }}
						viewport={viewport}
						whileInView="visible"
					>
						<OutcomeCard className="justify-between p-5 sm:col-span-2 lg:row-span-2" reducedMotion={motionDisabled}>
							<div className="flex items-center justify-between gap-4">
								<p className="font-medium font-mono text-foreground/55 text-xs uppercase">
									Puntaje CV <span className="text-muted-foreground">/ 100</span>
								</p>
								<span className="rounded-full bg-oxblood/15 px-2.5 py-1 font-mono font-semibold text-[10px] text-oxblood uppercase">
									+48 pts
								</span>
							</div>

							<div className="mt-7 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
								<div>
									<div className="flex items-baseline gap-3">
										<span className="font-display font-medium text-4xl text-foreground/25 tabular-nums leading-none tracking-tighter line-through decoration-foreground/25">
											47
										</span>
										<ArrowRightIcon className="text-foreground/35" size={18} weight="bold" />
										<span className="font-display font-semibold text-[clamp(4.5rem,9vw,6.5rem)] text-foreground tabular-nums leading-none tracking-tighter">
											95
										</span>
										<span className="font-display font-medium text-2xl text-foreground/30 tracking-tight">/100</span>
									</div>
									<div className="mt-5 h-2.5 overflow-hidden rounded-full bg-foreground/5 ring-1 ring-foreground/10 ring-inset">
										<motion.div
											className="h-full origin-left rounded-full bg-oxblood"
											initial={motionDisabled ? false : { scaleX: 0 }}
											transition={{ duration: 1.2, ease: EASE_OUT_QUINT, delay: 0.82 }}
											viewport={viewport}
											whileInView={motionDisabled ? undefined : { scaleX: 1 }}
										/>
									</div>
									<p className="mt-3 text-foreground/60 text-sm leading-snug">
										IA para el primer borrador. Coach senior para que suene a ti.
									</p>
								</div>

								<div
									aria-hidden="true"
									className="relative hidden h-40 w-34 shrink-0 rounded-3xl border border-border/60 bg-background/70 p-4 ring-1 ring-white/5 ring-inset sm:block"
								>
									<span className="block h-2 w-16 rounded-full bg-foreground/15" />
									<span className="mt-4 block h-1.5 w-24 rounded-full bg-foreground/10" />
									<span className="mt-2 block h-1.5 w-18 rounded-full bg-foreground/10" />
									<span className="mt-5 block h-1.5 w-20 rounded-full bg-oxblood/70" />
									<span className="mt-2 block h-1.5 w-24 rounded-full bg-foreground/10" />
									<span className="mt-2 block h-1.5 w-14 rounded-full bg-foreground/10" />
									<span className="absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-oxblood font-display font-semibold text-background text-sm">
										95
									</span>
								</div>
							</div>
						</OutcomeCard>

						<OutcomeCard className="lg:col-span-2" reducedMotion={motionDisabled}>
							<div className="flex items-start justify-between gap-5">
								<div>
									<p className="font-medium font-mono text-[11px] text-foreground/55 uppercase">Coach 1:1</p>
									<p className="mt-3 font-display font-semibold text-3xl text-foreground leading-none tracking-tight">
										Feedback humano
									</p>
								</div>
								<div aria-hidden="true" className="flex -space-x-2 pt-1">
									<span className="grid size-9 place-items-center rounded-full border border-background bg-oxblood/85 font-semibold text-background text-xs">
										SR
									</span>
									<span className="grid size-9 place-items-center rounded-full border border-background bg-foreground/12 font-semibold text-foreground/70 text-xs">
										IA
									</span>
								</div>
							</div>
							<div aria-hidden="true" className="mt-5 space-y-2">
								<span className="block w-11/12 rounded-2xl rounded-tl-sm bg-foreground/7 px-3 py-2">
									<span className="block h-1.5 w-36 rounded-full bg-foreground/18" />
								</span>
								<span className="ml-auto block w-9/12 rounded-2xl rounded-tr-sm bg-oxblood/12 px-3 py-2">
									<span className="block h-1.5 w-28 rounded-full bg-oxblood/45" />
								</span>
							</div>
						</OutcomeCard>

						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-medium font-mono text-[11px] text-foreground/55 uppercase">Primera entrevista</p>
							<div className="mt-4 flex items-end justify-between gap-4">
								<p className="font-display font-semibold text-5xl text-foreground tabular-nums leading-none tracking-tighter">
									18
									<span className="ml-1 font-medium text-foreground/45 text-lg tracking-tight">días</span>
								</p>
								<div aria-hidden="true" className="grid grid-cols-5 gap-1">
									<span className="size-2 rounded-sm bg-foreground/10" />
									<span className="size-2 rounded-sm bg-foreground/10" />
									<span className="size-2 rounded-sm bg-foreground/10" />
									<span className="size-2 rounded-sm bg-oxblood/35" />
									<span className="size-2 rounded-sm bg-oxblood" />
									<span className="size-2 rounded-sm bg-foreground/10" />
									<span className="size-2 rounded-sm bg-foreground/10" />
									<span className="size-2 rounded-sm bg-foreground/10" />
									<span className="size-2 rounded-sm bg-foreground/10" />
									<span className="size-2 rounded-sm bg-foreground/10" />
								</div>
							</div>
							<p className="mt-5 text-foreground/60 text-sm leading-snug">
								Promedio desde CV reescrito hasta la primera llamada.
							</p>
						</OutcomeCard>

						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-medium font-mono text-[11px] text-foreground/55 uppercase">Inversión clara</p>
							<p className="mt-4 font-display font-semibold text-5xl text-foreground tabular-nums leading-none tracking-tighter">
								S/79
								<span className="ml-1 font-medium text-base text-foreground/45 tracking-tight">/mes</span>
							</p>
							<div aria-hidden="true" className="mt-5 rounded-2xl border border-border/60 bg-background/65 p-3">
								<div className="flex items-center justify-between gap-3">
									<span className="h-1.5 w-20 rounded-full bg-foreground/15" />
									<span className="h-1.5 w-10 rounded-full bg-oxblood/55" />
								</div>
								<div className="mt-3 flex items-center justify-between gap-3">
									<span className="h-1.5 w-14 rounded-full bg-foreground/10" />
									<span className="h-1.5 w-8 rounded-full bg-foreground/12" />
								</div>
							</div>
						</OutcomeCard>
					</motion.div>
				</div>
			</section>

			{/* Unhidden & Polished Stats Section */}
			<section className="relative border-border/50 border-t bg-muted/20 px-6 py-12 sm:py-16">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10">
					<motion.dl
						className="flex w-full flex-wrap items-baseline justify-center gap-x-12 gap-y-8 text-center sm:justify-around"
						initial="hidden"
						transition={{ staggerChildren: 0.12 }}
						viewport={{ once: true, margin: "-15% 0px" }}
						whileInView="visible"
					>
						<HeroStat
							countTo={240}
							label="entrevistas conseguidas"
							reducedMotion={motionDisabled}
							suffix="+"
							value="240+"
						/>
						<HeroStat
							countTo={4.9}
							decimals={1}
							label="en 90 reseñas verificadas"
							reducedMotion={motionDisabled}
							suffix="★"
							value="4.9★"
						/>
						<HeroStat countTo={18} label="días a tu primera entrevista" reducedMotion={motionDisabled} value="18" />
					</motion.dl>

					<div className="flex w-full flex-col items-center gap-6">
						<p className="font-medium font-mono text-[11px] text-foreground/50 uppercase">
							Nuestros talentos ya trabajan en
						</p>
						<LogoMarqueeRows />
						<p className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-balance text-center font-medium font-mono text-[10px] text-foreground/40 uppercase">
							<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-foreground/20" />
							<span>Empresas verificadas a través del LinkedIn de cada talento</span>
						</p>
					</div>
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
		<motion.div
			className={`group relative flex flex-col overflow-hidden rounded-xl border border-border/45 bg-muted p-5 ring-1 ring-white/5 ring-inset backdrop-blur-xl transition-colors duration-300 hover:border-oxblood/35 ${className}`}
			variants={reducedMotion ? undefined : outcomeCardVariants}
			whileHover={reducedMotion ? undefined : { y: -4 }}
		>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-6 top-0 h-px origin-left scale-x-0 bg-oxblood/80 transition-transform duration-500 group-hover:scale-x-100"
			/>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute -top-20 -right-16 size-40 rounded-full bg-oxblood/8 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
			/>
			<div className="relative z-10 flex h-full flex-col">{children}</div>
		</motion.div>
	);
}

const heroStatVariants = {
	hidden: { opacity: 0, y: 16 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT_QUINT } },
};

function HeroStat({
	label,
	value,
	countTo,
	decimals = 0,
	suffix = "",
	reducedMotion,
}: {
	label: string;
	value: string;
	countTo?: number;
	decimals?: number;
	suffix?: string;
	reducedMotion: boolean;
}) {
	return (
		<motion.div className="flex flex-col items-center gap-3" variants={reducedMotion ? undefined : heroStatVariants}>
			<dt className="font-display font-semibold text-[clamp(2.5rem,4vw,3.5rem)] text-foreground tabular-nums leading-none tracking-tighter">
				{countTo === undefined ? (
					value
				) : (
					<CountUp decimals={decimals} duration={1.5} once suffix={suffix} to={countTo} />
				)}
			</dt>
			<dd className="max-w-[18ch] text-balance font-medium font-mono text-[11px] text-foreground/50 uppercase">
				{label}
			</dd>
		</motion.div>
	);
}

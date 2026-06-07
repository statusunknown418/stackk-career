import { ArrowRightIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "@/components/ui/count-up";
import { LogoMarqueeRows } from "@/components/ui/logo-marquee-rows";
import { HeroAuroraShader } from "./hero-aurora-shader";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

export function Hero() {
	const prefersReducedMotion = useReducedMotion();
	const motionDisabled = prefersReducedMotion ?? false;

	const fadeUp = motionDisabled ? false : { opacity: 0, y: 20 };
	const fadeIn = motionDisabled ? undefined : { opacity: 1, y: 0 };
	const viewport = { once: true, margin: "-10% 0px" } as const;

	return (
		<>
			<section
				className="relative isolate flex min-h-[88vh] flex-col justify-center overflow-hidden bg-background px-6 pt-28 pb-20 sm:pt-32 sm:pb-24"
				id="top"
			>
				{/* Flowing green mesh gradient behind the headline (replaces the grid) */}
				<HeroAuroraShader />

				<div className="relative z-10 mx-auto w-full max-w-[1180px]">
					{/* Headline, single bold weight, near-black */}
					<motion.h1
						className="max-w-[14ch] font-display font-semibold text-[clamp(2.5rem,8vw,6rem)] text-foreground leading-[0.95] tracking-tighter"
						initial={fadeUp}
						transition={{ duration: 0.7, ease: EASE_OUT_QUINT, delay: 0.1 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						Tu próxima entrevista en menos de{" "}
						<span className="relative inline-block whitespace-nowrap text-oxblood">
							3 meses
							<motion.span
								aria-hidden="true"
								className="absolute right-0 bottom-[0.08em] left-0 h-[0.08em] origin-left rounded-full bg-oxblood"
								initial={motionDisabled ? false : { scaleX: 0 }}
								transition={{ duration: 0.8, ease: EASE_OUT_QUINT, delay: 0.55 }}
								viewport={viewport}
								whileInView={motionDisabled ? undefined : { scaleX: 1 }}
							/>
						</span>
					</motion.h1>

					{/* Supporting line */}
					<motion.p
						className="mt-8 max-w-[560px] text-[clamp(1.05rem,1.3vw,1.2rem)] text-foreground leading-normal"
						initial={fadeUp}
						transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: 0.3 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						Tu CV potenciado con un Agente especializado de IA. Y un coach que ya pasó por lo mismo, contigo hasta la
						entrevista.
					</motion.p>

					{/* CTAs */}
					<motion.div
						className="mt-10 flex flex-col flex-wrap items-start gap-x-5 gap-y-3 sm:flex-row sm:items-center"
						initial={fadeUp}
						transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: 0.4 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						{/* Pre-launch: the product isn't live yet, so the CTA carries a "Muy pronto"
						    tag (breathing dot keeps it alive) and leads to /waitlist. */}
						<Link
							className="group inline-flex h-13 items-center gap-2.5 rounded-full bg-oxblood py-3.5 pr-6 pl-6 font-semibold text-base text-neutral-950 leading-none tracking-tight shadow-cta transition-all duration-200 hover:-translate-y-px hover:shadow-cta-hover"
							to="/waitlist"
						>
							<span className="leading-none">Analiza mi CV gratis</span>
							<span aria-hidden="true" className="h-4 w-px bg-current opacity-25" />
							<span className="font-mono text-xs uppercase leading-none tracking-wide opacity-70">Muy pronto</span>
						</Link>
						<a
							className="group inline-flex h-12 items-center gap-2 font-medium text-foreground/70 transition hover:text-foreground"
							href="#planes"
						>
							Ver planes y precios
							<ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-0.5" weight="bold" />
						</a>
					</motion.div>

					{/* risk-reversal chips */}
					<motion.ul
						className="mt-9 flex flex-col items-start gap-2 text-foreground/60 text-xs uppercase sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
						initial={fadeUp}
						transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: 0.5 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						<li className="inline-flex items-center gap-1.5">
							<ShieldCheckIcon className="text-oxblood" size={13} weight="bold" />
							<span>Garantía 90 días</span>
						</li>
						<li aria-hidden="true" className="hidden size-1 rounded-full bg-foreground/25 sm:block" />
						<li>Score gratis, sin tarjeta</li>
						<li aria-hidden="true" className="hidden size-1 rounded-full bg-foreground/25 sm:block" />
						<li>Cancelas cuando quieras</li>
					</motion.ul>

					{/* Outcome cards — one featured metric + three supporting (not a flat
					    grid of identical cards). */}
					<motion.div
						className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2"
						initial="hidden"
						transition={{ staggerChildren: 0.1, delayChildren: 0.6 }}
						viewport={viewport}
						whileInView="visible"
					>
						{/* FEATURED — Score CV, the headline proof, big and tinted */}
						<OutcomeCard
							className="justify-between p-6 sm:col-span-2 lg:col-span-2 lg:row-span-2"
							reducedMotion={motionDisabled}
						>
							<div className="relative flex items-center justify-between">
								<p className="font-mono text-foreground/60 text-xs uppercase tracking-widest">
									Puntaje de tu CV <span className="text-foreground/35">/ 100</span>
								</p>
								<span className="rounded-full bg-oxblood/15 px-2 py-0.5 font-medium font-mono text-oxblood text-xs uppercase tracking-widest">
									+48 pts
								</span>
							</div>
							<div className="relative mt-auto pt-8">
								<div className="flex items-baseline gap-3">
									<span className="font-display font-semibold text-4xl text-foreground/35 tabular-nums leading-none tracking-tight line-through decoration-2">
										47
									</span>
									<ArrowRightIcon className="text-foreground/40" size={18} weight="bold" />
									<span className="font-display font-semibold text-[clamp(3.5rem,7vw,5rem)] text-foreground tabular-nums leading-none tracking-tighter">
										95
									</span>
									<span className="font-display font-medium text-foreground/30 text-xl tabular-nums tracking-tight">
										/100
									</span>
								</div>
								<div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
									<motion.div
										className="h-full rounded-full bg-oxblood"
										initial={motionDisabled ? false : { width: "0%" }}
										transition={{ duration: 1.1, ease: EASE_OUT_QUINT, delay: 0.9 }}
										viewport={viewport}
										whileInView={motionDisabled ? undefined : { width: "95%" }}
									/>
								</div>
								<p className="mt-3 text-foreground/60 text-sm leading-snug">
									Reescrito por IA y revisado por tu coach, listo para reclutadores.
								</p>
							</div>
						</OutcomeCard>

						<OutcomeCard className="lg:col-span-2" reducedMotion={motionDisabled}>
							<p className="font-mono text-foreground/55 text-xs uppercase tracking-widest">Juega de tu lado</p>
							<p className="mt-3 font-display font-semibold text-3xl text-foreground leading-none tracking-tight">
								Coach 1:1 senior
							</p>
							<p className="mt-4 font-mono text-foreground/70 text-xs uppercase tracking-widest">
								Hoy trabajan en las top 25 empresas peruanas y latinoamericanas
							</p>
						</OutcomeCard>

						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-mono text-foreground/55 text-xs uppercase tracking-widest">Primera entrevista</p>
							<p className="mt-3 font-display font-semibold text-4xl text-foreground tabular-nums leading-none tracking-tighter">
								Día 18
							</p>
							<div className="mt-4 flex items-center gap-1">
								{Array.from({ length: 18 }, (_, i) => i).map((i) => (
									<motion.span
										className="h-3 w-0.5 origin-bottom rounded-full bg-oxblood/70"
										initial={motionDisabled ? false : { scaleY: 0 }}
										key={`tick-${i}`}
										transition={{
											duration: 0.4,
											ease: EASE_OUT_QUINT,
											delay: 0.9 + i * 0.025,
										}}
										viewport={viewport}
										whileInView={motionDisabled ? undefined : { scaleY: 1 }}
									/>
								))}
								<span className="ml-2 font-mono text-foreground/55 text-xs uppercase tracking-widest">promedio</span>
							</div>
						</OutcomeCard>

						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-mono text-foreground/55 text-xs uppercase tracking-widest">Tu inversión</p>
							<p className="mt-3 font-display font-semibold text-4xl text-foreground tabular-nums leading-none tracking-tighter">
								S/79
								<span className="font-medium text-base text-foreground/50 tracking-tight">/mes</span>
								<span className="ml-2 font-medium font-mono text-foreground/55 text-xs tracking-tight">≈ US$23</span>
							</p>
							<p className="mt-4 font-mono text-foreground/55 text-xs uppercase tracking-widest">
								o S/40 (≈ US$11) la sesión única, sin suscripción
							</p>
						</OutcomeCard>
					</motion.div>
				</div>
			</section>

			<section className="relative border-border border-b bg-muted/40 px-6 pt-14 pb-16">
				<div className="mx-auto flex max-w-7xl flex-col items-center gap-12">
					<motion.dl
						className="hidden flex-wrap items-baseline justify-center gap-x-12 gap-y-4 text-center"
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
						<p className="font-mono text-foreground/65 text-xs uppercase tracking-widest">
							Nuestros talentos ya trabajan en
						</p>
						<LogoMarqueeRows />
						<p className="hidden max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-balance text-center font-mono text-foreground/60 text-xs uppercase tracking-widest">
							<span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-foreground/20" />
							<span>Empresas verificadas a través del LinkedIn de cada talento</span>
						</p>
					</div>
				</div>
			</section>
		</>
	);
}

const outcomeCardVariants = {
	hidden: { opacity: 0, y: 16 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_QUINT } },
};

function OutcomeCard({
	children,
	reducedMotion,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
	reducedMotion: boolean;
}) {
	return (
		<motion.div
			className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-oxblood/50 hover:shadow-[0_12px_32px_-12px_oklch(0.13_0_0_/_0.12)] ${className}`}
			variants={reducedMotion ? undefined : outcomeCardVariants}
			whileHover={reducedMotion ? undefined : { rotate: -0.4 }}
		>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-5 top-0 h-px origin-left scale-x-0 bg-oxblood transition-transform duration-300 group-hover:scale-x-100"
			/>
			{children}
		</motion.div>
	);
}

const heroStatVariants = {
	hidden: { opacity: 0, y: 14 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_QUINT } },
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
		<motion.div className="flex flex-col items-center gap-1" variants={reducedMotion ? undefined : heroStatVariants}>
			<dt className="font-display font-semibold text-[clamp(2rem,3.5vw,2.75rem)] text-foreground tabular-nums leading-none tracking-tighter">
				{countTo === undefined ? (
					value
				) : (
					<CountUp decimals={decimals} duration={1.2} once suffix={suffix} to={countTo} />
				)}
			</dt>
			<dd className="max-w-[18ch] font-mono text-foreground/60 text-xs uppercase tracking-widest">{label}</dd>
		</motion.div>
	);
}

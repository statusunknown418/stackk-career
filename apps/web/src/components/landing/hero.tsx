import { ArrowRightIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "@/components/ui/count-up";
import { LogoMarqueeRows } from "@/components/ui/logo-marquee-rows";

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
				{/* faint grid floor, very subtle on white */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(to_right,var(--color-foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-foreground)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
				/>

				<div className="relative z-10 mx-auto w-full max-w-[1180px]">
					{/* live badge */}
					<motion.div
						className="mb-10 flex items-center"
						initial={fadeUp}
						transition={{ duration: 0.6, ease: EASE_OUT_QUINT }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						<span className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-3.5 pl-2.5">
							<span aria-hidden="true" className="relative grid size-2 place-items-center">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-oxblood/40" />
								<span className="relative size-2 rounded-full bg-oxblood" />
							</span>
							<span className="font-medium text-[12px] text-foreground/75 tracking-[0.02em]">
								Hecho en Perú, para LATAM
							</span>
						</span>
					</motion.div>

					{/* Headline, single bold weight, near-black */}
					<motion.h1
						className="max-w-[14ch] font-bold font-display text-[clamp(2.5rem,8vw,6rem)] text-foreground leading-[0.95] tracking-[-0.04em]"
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
						className="mt-8 max-w-[560px] text-[clamp(1.05rem,1.3vw,1.2rem)] text-muted-foreground leading-[1.5]"
						initial={fadeUp}
						transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: 0.3 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						CV reescrito por IA en 30 segundos. Coach senior real hasta tu próxima entrevista.
					</motion.p>

					{/* CTAs */}
					<motion.div
						className="mt-10 flex flex-col flex-wrap items-start gap-x-5 gap-y-3 sm:flex-row sm:items-center"
						initial={fadeUp}
						transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: 0.4 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						<a
							className="group inline-flex h-13 items-center gap-3 rounded-full bg-oxblood py-3.5 pr-4 pl-6 font-semibold text-[15px] text-background tracking-tight shadow-[0_1px_0_oklch(0.13_0_0_/_0.08),0_8px_24px_-12px_oklch(from_var(--oxblood)_l_c_h/0.5)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_1px_0_oklch(0.13_0_0_/_0.08),0_14px_30px_-12px_oklch(from_var(--oxblood)_l_c_h/0.6)]"
							href="/setup"
						>
							Analiza mi CV gratis
							<span className="inline-grid size-7 place-items-center rounded-full bg-background/15 transition-transform duration-200 group-hover:translate-x-0.5">
								<ArrowRightIcon size={14} weight="bold" />
							</span>
						</a>
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
						className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10.5px] text-foreground/60 uppercase tracking-[0.18em]"
						initial={fadeUp}
						transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: 0.5 }}
						viewport={viewport}
						whileInView={fadeIn}
					>
						<li className="inline-flex items-center gap-1.5">
							<ShieldCheckIcon className="text-oxblood" size={13} weight="bold" />
							<span>Garantía 90 días</span>
						</li>
						<li aria-hidden="true" className="size-1 rounded-full bg-foreground/25" />
						<li>Score gratis, sin tarjeta</li>
						<li aria-hidden="true" className="size-1 rounded-full bg-foreground/25" />
						<li>Cancelas cuando quieras</li>
					</motion.ul>

					{/* Outcome cards cluster — concard signature, adapted */}
					<motion.div
						className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
						initial="hidden"
						transition={{ staggerChildren: 0.1, delayChildren: 0.6 }}
						viewport={viewport}
						whileInView="visible"
					>
						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.2em]">Score CV</p>
							<div className="mt-3 flex items-baseline gap-2">
								<span className="font-bold font-display text-[28px] text-foreground/40 tabular-nums leading-none tracking-[-0.03em] line-through decoration-2">
									47
								</span>
								<ArrowRightIcon className="text-foreground/40" size={14} weight="bold" />
								<span className="font-bold font-display text-[40px] text-foreground tabular-nums leading-none tracking-[-0.04em]">
									95
								</span>
							</div>
							<div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
								<motion.div
									className="h-full rounded-full bg-oxblood"
									initial={motionDisabled ? false : { width: "0%" }}
									transition={{ duration: 1.1, ease: EASE_OUT_QUINT, delay: 0.9 }}
									viewport={viewport}
									whileInView={motionDisabled ? undefined : { width: "95%" }}
								/>
							</div>
						</OutcomeCard>

						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.2em]">Coach 1:1 senior</p>
							<p className="mt-3 font-bold font-display text-[28px] text-foreground leading-[1] tracking-[-0.03em]">
								Real, no IA
							</p>
							<p className="mt-4 font-mono text-[10.5px] text-foreground/70 uppercase tracking-[0.16em]">
								ex-BCP <span className="text-foreground/30">·</span> ex-Yape
							</p>
						</OutcomeCard>

						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.2em]">Primera entrevista</p>
							<p className="mt-3 font-bold font-display text-[40px] text-foreground tabular-nums leading-none tracking-[-0.04em]">
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
								<span className="ml-2 font-mono text-[9.5px] text-foreground/45 uppercase tracking-[0.18em]">
									promedio
								</span>
							</div>
						</OutcomeCard>

						<OutcomeCard reducedMotion={motionDisabled}>
							<p className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.2em]">Tu inversión</p>
							<p className="mt-3 font-bold font-display text-[40px] text-foreground tabular-nums leading-none tracking-[-0.04em]">
								S/79
								<span className="font-medium text-[16px] text-foreground/50 tracking-tight">/mes</span>
							</p>
							<p className="mt-4 font-mono text-[10.5px] text-foreground/55 uppercase tracking-[0.16em]">
								desde <span className="text-foreground/35 line-through">S/250</span> por sesión suelta
							</p>
						</OutcomeCard>
					</motion.div>
				</div>
			</section>

			<section className="relative border-border border-y bg-muted/40 px-6 pt-14 pb-16">
				<div className="mx-auto flex max-w-[1200px] flex-col items-center gap-12">
					<motion.dl
						className="flex flex-wrap items-baseline justify-center gap-x-12 gap-y-4 text-center"
						initial="hidden"
						transition={{ staggerChildren: 0.12 }}
						viewport={{ once: true, margin: "-15% 0px" }}
						whileInView="visible"
					>
						<HeroStat
							countTo={2400}
							label="entrevistas el último año"
							reducedMotion={motionDisabled}
							suffix="+"
							value="2.400+"
						/>
						<HeroStat
							countTo={4.9}
							decimals={1}
							label="en 380 reseñas verificadas"
							reducedMotion={motionDisabled}
							suffix="★"
							value="4.9★"
						/>
						<HeroStat countTo={18} label="días a tu primera entrevista" reducedMotion={motionDisabled} value="18" />
					</motion.dl>
					<div className="flex w-full flex-col items-center gap-6 border-border border-t pt-10">
						<p className="font-mono text-[10px] text-foreground/65 uppercase tracking-[0.22em]">
							Nuestros talentos ya trabajan en
						</p>
						<LogoMarqueeRows />
						<p className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-balance text-center font-mono text-[10px] text-foreground/60 uppercase tracking-[0.18em]">
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

function OutcomeCard({ children, reducedMotion }: { children: React.ReactNode; reducedMotion: boolean }) {
	return (
		<motion.div
			className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-oxblood/50 hover:shadow-[0_12px_32px_-12px_oklch(0.13_0_0_/_0.12)]"
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
			<dt className="font-bold font-display text-[clamp(2rem,3.5vw,2.75rem)] text-foreground tabular-nums leading-none tracking-[-0.04em]">
				{countTo === undefined ? (
					value
				) : (
					<CountUp decimals={decimals} duration={1.2} once suffix={suffix} to={countTo} />
				)}
			</dt>
			<dd className="max-w-[18ch] font-mono text-[10px] text-foreground/60 uppercase tracking-[0.16em]">{label}</dd>
		</motion.div>
	);
}

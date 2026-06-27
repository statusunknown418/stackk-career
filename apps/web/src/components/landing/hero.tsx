import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { LogoMarqueeRows } from "@/components/ui/logo-marquee-rows";
import { HeroAuroraShader } from "./hero-aurora-shader";

const EASE_OUT_QUINT = [0.16, 1, 0.3, 1] as const;

const PROOF_POINTS = [
	"CV reescrito para el rol exacto",
	"Postulaciones con criterio, no al azar",
	"Coach senior hasta conseguir entrevista",
] as const;

const BOARD_ITEMS = [
	{ label: "Diagnóstico", value: "CV flojo, historia fuerte" },
	{ label: "Reescritura", value: "Impacto medible, tono propio" },
	{ label: "Ataque", value: "Roles donde sí compites" },
] as const;

const focusRing = "focus-visible:outline-2 focus-visible:outline-oxblood focus-visible:outline-offset-4";

export function Hero() {
	const prefersReducedMotion = useReducedMotion();
	const motionDisabled = prefersReducedMotion ?? false;

	const fadeUp = motionDisabled ? false : { opacity: 0, y: 28 };
	const fadeIn = motionDisabled ? undefined : { opacity: 1, y: 0 };
	const viewport = { once: true, margin: "-12% 0px" } as const;

	return (
		<>
			<section
				className="relative isolate flex min-h-svh overflow-hidden bg-landing-color px-4 pt-24 pb-16 text-foreground sm:px-6 lg:pt-28"
				id="top"
			>
				<HeroAuroraShader />
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-linear-to-t from-landing-color to-transparent"
				/>

				<div className="relative z-20 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-5 lg:gap-14">
					<div className="flex max-w-4xl flex-col justify-center pb-2 lg:col-span-3">
						<motion.h1
							className="max-w-4xl text-balance font-display text-7xl leading-none tracking-[-0.07em] sm:text-8xl md:text-[6.75rem]"
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
							<p className="max-w-xl text-pretty text-foreground/75 text-lg leading-7">
								Assendia convierte tu experiencia en un CV competitivo y te acompaña con un coach real hasta la primera
								entrevista. Si no llega en 90 días, Premium se devuelve.
							</p>
						</motion.div>

						<motion.div
							className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
							initial={fadeUp}
							transition={{ duration: 0.72, ease: EASE_OUT_QUINT, delay: 0.32 }}
							viewport={viewport}
							whileInView={fadeIn}
						>
							<Link
								aria-label="Analiza mi CV gratis, muy pronto"
								className={`inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 text-primary-foreground shadow-cta transition duration-500 ease-out hover:-translate-y-0.5 hover:shadow-cta-hover ${focusRing}`}
								to="/login"
							>
								<span>Analiza mi CV gratis</span>
							</Link>

							<a
								className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-foreground/20 px-5 text-foreground/80 transition duration-500 ease-out hover:-translate-y-0.5 hover:border-oxblood/40 hover:text-oxblood ${focusRing}`}
								href="#planes"
							>
								Ver planes
								<ArrowRightIcon className="transition-transform duration-500 ease-out group-hover:translate-x-1" />
							</a>
						</motion.div>

						<motion.ul
							className="mt-12 grid gap-3 border-foreground/15 border-t pt-5 sm:grid-cols-3"
							initial="hidden"
							transition={{ staggerChildren: 0.08, delayChildren: 0.46 }}
							viewport={viewport}
							whileInView="visible"
						>
							{PROOF_POINTS.map((point, index) => (
								<ProofPoint index={index + 1} key={point} reducedMotion={motionDisabled}>
									{point}
								</ProofPoint>
							))}
						</motion.ul>
					</div>

					<PursuitBoard reducedMotion={motionDisabled} viewport={viewport} />
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

function ProofPoint({
	children,
	index,
	reducedMotion,
}: {
	children: ReactNode;
	index: number;
	reducedMotion: boolean;
}) {
	return (
		<motion.li
			className="flex gap-3 text-foreground/70 text-sm leading-5"
			variants={
				reducedMotion
					? undefined
					: {
							hidden: { opacity: 0, y: 14 },
							visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT_QUINT } },
						}
			}
		>
			<span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-oxblood/30 font-mono text-oxblood text-xs">
				{index}
			</span>
			<span>{children}</span>
		</motion.li>
	);
}

function PursuitBoard({
	reducedMotion,
	viewport,
}: {
	reducedMotion: boolean;
	viewport: { once: true; margin: string };
}) {
	return (
		<motion.aside
			aria-label="Vista previa del tablero de carrera ASSENDIA"
			className="relative mx-auto w-full max-w-xl pb-4 lg:col-span-2 lg:pb-12"
			initial={reducedMotion ? false : { opacity: 0, x: 34, rotate: 1.5 }}
			transition={{ duration: 0.9, ease: EASE_OUT_QUINT, delay: 0.22 }}
			viewport={viewport}
			whileInView={reducedMotion ? undefined : { opacity: 1, x: 0, rotate: 0 }}
		>
			<div className="relative rounded-4xl border border-foreground/15 bg-card/85 p-7 shadow-2xl shadow-oxblood/20">
				<div className="flex items-center justify-between gap-4">
					<h2 className="max-w-xs font-display text-lg leading-none tracking-tight">
						CV, plan y coach en un mismo ritmo.
					</h2>

					<span className="rounded-full bg-oxblood px-3 py-1.5 font-mono text-background text-xs uppercase">
						activo
					</span>
				</div>

				<div className="mt-8 grid gap-3">
					{BOARD_ITEMS.map((item, index) => (
						<BoardItem index={index + 1} item={item} key={item.label} />
					))}
				</div>

				<div className="mt-8 rounded-3xl bg-foreground p-4 text-background">
					<p className="text-pretty leading-6">
						No vendemos motivación. Reescribimos evidencia: logros, foco y un guión para hablar de tu valor.
					</p>
					<div className="mt-5 flex flex-wrap gap-2">
						<span className="rounded-full bg-oxblood/20 px-3 py-1 text-xs">ATS legible</span>
						<span className="rounded-full bg-background/10 px-3 py-1 text-xs">historia clara</span>
						<span className="rounded-full bg-background/10 px-3 py-1 text-xs">rol objetivo</span>
					</div>
				</div>
			</div>

			<div
				aria-hidden="true"
				className="absolute -right-2 -bottom-1 hidden w-48 rotate-3 rounded-2xl bg-oxblood px-4 py-3 text-background shadow-2xl shadow-oxblood/30 sm:block"
			>
				<p className="font-mono text-xs uppercase">siguiente paso</p>
				<p className="mt-2 text-sm leading-5">Enviar 8 postulaciones con el CV nuevo.</p>
			</div>
		</motion.aside>
	);
}

function BoardItem({ index, item }: { index: number; item: (typeof BOARD_ITEMS)[number] }) {
	return (
		<div className="flex gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 p-3">
			<span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/10 font-mono text-oxblood text-xs">
				{index}
			</span>
			<span className="min-w-0">
				<span className="block font-mono text-foreground/50 text-xs uppercase">{item.label}</span>
				<span className="mt-1 block text-foreground/90 text-sm leading-5">{item.value}</span>
			</span>
		</div>
	);
}

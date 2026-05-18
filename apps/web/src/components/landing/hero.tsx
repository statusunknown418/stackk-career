import { ArrowRightIcon, CalendarCheckIcon, CheckIcon, SparkleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { LogoMarqueeRows } from "@/components/ui/logo-marquee-rows";

const FLOAT_DELAY_0: React.CSSProperties = { animationDelay: "0s" };
const FLOAT_DELAY_2: React.CSSProperties = { animationDelay: "-2s" };
const FLOAT_DELAY_4: React.CSSProperties = { animationDelay: "-4s" };

const MESH_BLOB_2_DELAY: React.CSSProperties = { animationDelay: "-6s" };
const MESH_BLOB_3_DELAY: React.CSSProperties = { animationDelay: "-12s" };
const MESH_BLOB_4_DELAY: React.CSSProperties = { animationDelay: "-18s" };

interface Particle {
	delay: string;
	duration: string;
	left: string;
	opacity: string;
	size: string;
}

const PARTICLES: readonly Particle[] = [
	{ left: "4%", duration: "13s", delay: "-1s", size: "size-1", opacity: "0.55" },
	{ left: "9%", duration: "18s", delay: "-5s", size: "size-1.5", opacity: "0.7" },
	{ left: "14%", duration: "15s", delay: "-9s", size: "size-1", opacity: "0.5" },
	{ left: "21%", duration: "21s", delay: "-3s", size: "size-2", opacity: "0.65" },
	{ left: "27%", duration: "12s", delay: "-12s", size: "size-1", opacity: "0.6" },
	{ left: "33%", duration: "16s", delay: "-6s", size: "size-1.5", opacity: "0.7" },
	{ left: "39%", duration: "19s", delay: "-14s", size: "size-1", opacity: "0.5" },
	{ left: "46%", duration: "14s", delay: "-2s", size: "size-1.5", opacity: "0.65" },
	{ left: "53%", duration: "22s", delay: "-10s", size: "size-1", opacity: "0.55" },
	{ left: "59%", duration: "17s", delay: "-7s", size: "size-2", opacity: "0.75" },
	{ left: "66%", duration: "13s", delay: "-11s", size: "size-1", opacity: "0.5" },
	{ left: "72%", duration: "20s", delay: "-4s", size: "size-1.5", opacity: "0.7" },
	{ left: "78%", duration: "15s", delay: "-13s", size: "size-1", opacity: "0.55" },
	{ left: "84%", duration: "18s", delay: "-8s", size: "size-1.5", opacity: "0.6" },
	{ left: "91%", duration: "12s", delay: "-2s", size: "size-1", opacity: "0.5" },
	{ left: "96%", duration: "19s", delay: "-15s", size: "size-1.5", opacity: "0.65" },
];

export function Hero() {
	return (
		<>
			<section
				className="relative flex min-h-[88vh] flex-col justify-center overflow-hidden px-6 pt-24 pb-12 sm:pt-28 sm:pb-16"
				id="top"
			>
				<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-[5%] left-[8%] size-[45%] animate-mesh-drift-1 rounded-full bg-oxblood/45 blur-[100px] will-change-transform motion-reduce:animate-none" />
					<div
						className="absolute top-[15%] right-[3%] size-[40%] animate-mesh-drift-2 rounded-full bg-oxblood/35 blur-[110px] will-change-transform motion-reduce:animate-none"
						style={MESH_BLOB_2_DELAY}
					/>
					<div
						className="absolute bottom-[8%] left-[20%] size-[50%] animate-mesh-drift-1 rounded-full bg-oxblood/40 blur-[120px] will-change-transform motion-reduce:animate-none"
						style={MESH_BLOB_3_DELAY}
					/>
					<div
						className="absolute right-[10%] bottom-[12%] size-[38%] animate-mesh-drift-2 rounded-full bg-oxblood/30 blur-[110px] will-change-transform motion-reduce:animate-none"
						style={MESH_BLOB_4_DELAY}
					/>
					<div className="absolute top-[40%] left-[42%] size-[18%] animate-pulse-glow rounded-full bg-oxblood/60 blur-[60px] will-change-transform motion-reduce:animate-none" />
					<div
						className="absolute top-[25%] right-[35%] size-[14%] animate-pulse-glow rounded-full bg-oxblood/50 blur-[50px] will-change-transform motion-reduce:animate-none"
						style={MESH_BLOB_2_DELAY}
					/>
					<div className="absolute inset-0 animate-hero-sweep bg-gradient-to-r from-transparent via-oxblood/15 to-transparent blur-2xl will-change-transform motion-reduce:hidden" />
					<div className="absolute inset-0 motion-reduce:hidden">
						{PARTICLES.map((p) => (
							<span
								className={`absolute bottom-0 ${p.size} rounded-full bg-oxblood will-change-transform`}
								key={`${p.left}-${p.delay}`}
								style={
									{
										left: p.left,
										opacity: 0,
										"--peak-opacity": p.opacity,
										animation: `particle-rise ${p.duration} linear infinite`,
										animationDelay: p.delay,
										boxShadow: "0 0 12px oklch(from var(--oxblood) l c h / 0.8)",
									} as React.CSSProperties
								}
							/>
						))}
					</div>
				</div>
				<div className="pointer-events-none relative z-10 mx-auto grid w-full min-w-0 max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
					<div className="min-w-0">
						<div className="pointer-events-auto mb-7 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/70 py-1.5 pr-3.5 pl-2.5 backdrop-blur-sm">
							<span aria-hidden="true" className="relative grid size-2 place-items-center">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-oxblood/50" />
								<span className="relative size-2 rounded-full bg-oxblood" />
							</span>
							<span className="font-medium text-[12px] text-foreground/75 tracking-[0.02em]">
								Hecho en Perú, para LATAM
							</span>
						</div>

						<h1 className="text-balance break-words font-bold font-display text-[clamp(2rem,6vw,5.25rem)] text-foreground leading-[1.02] tracking-[-0.035em] sm:leading-[0.98]">
							Garantizamos tu próxima entrevista en menos de{" "}
							<span className="relative whitespace-nowrap">
								<span className="relative z-10">3 meses</span>
								<span
									aria-hidden="true"
									className="absolute inset-x-[-2px] bottom-[6%] -z-0 h-[28%] rounded-sm bg-oxblood/30"
								/>
							</span>
							.
						</h1>

						<p className="mt-7 max-w-[560px] text-[clamp(1rem,1.2vw,1.15rem)] text-foreground/65 leading-[1.55]">
							IA que reescribe tu CV en 30 segundos. Coach senior que te prepara para destacar en cada entrevista. Con
							Premium: si en 90 días no consigues entrevista, te devolvemos el 100%.
						</p>

						<div className="pointer-events-auto mt-9 flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-center">
							<a
								className="group/drop relative flex w-full max-w-[400px] items-center gap-3 overflow-hidden rounded-2xl border-2 border-foreground/15 border-dashed bg-card/50 p-3.5 backdrop-blur-sm transition-all duration-300 hover:border-oxblood/50 hover:bg-card/80"
								href="/setup"
							>
								<span
									aria-hidden="true"
									className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/drop:opacity-100"
								>
									<span className="absolute inset-x-4 top-0 h-px animate-[score-fill_1.8s_cubic-bezier(.2,.7,.2,1)_infinite] bg-gradient-to-r from-transparent via-oxblood/60 to-transparent" />
								</span>
								<span className="relative grid size-11 place-items-center rounded-xl bg-oxblood text-background transition-transform duration-300 group-hover/drop:scale-110">
									<UploadSimpleIcon size={20} weight="bold" />
								</span>
								<span className="relative flex-1 text-left">
									<span className="block font-display font-semibold text-[15px] text-foreground tracking-tight">
										Arrastra tu CV o haz clic
									</span>
									<span className="block font-mono text-[10px] text-foreground/70 uppercase tracking-[0.12em]">
										PDF · Score en 30s · Gratis
									</span>
								</span>
								<ArrowRightIcon
									className="relative shrink-0 text-foreground/70 transition-all duration-300 group-hover/drop:translate-x-1 group-hover/drop:text-oxblood"
									size={18}
									weight="bold"
								/>
							</a>
							<a
								className="inline-flex h-11 items-center gap-2 px-2 font-medium text-foreground/80 transition hover:text-foreground"
								href="#planes"
							>
								Ver planes
								<ArrowRightIcon weight="bold" />
							</a>
						</div>
					</div>

					<HeroCardCluster />
				</div>
			</section>

			<section className="relative border-foreground/5 border-t bg-foreground/[0.015] px-6 py-14">
				<div className="absolute top-0 left-1/2 h-px w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-oxblood/30 to-transparent" />
				<div className="mx-auto flex max-w-[1200px] flex-col items-center gap-8">
					<p className="font-mono text-[10px] text-foreground/65 uppercase tracking-[0.22em]">
						Nuestros talentos ya trabajan en
					</p>
					<LogoMarqueeRows />
					<p className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-balance text-center font-mono text-[10px] text-foreground/65 uppercase tracking-[0.18em]">
						<span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-oxblood/60" />
						<span>Empresas verificadas vía LinkedIn de cada talento</span>
					</p>
				</div>
			</section>
		</>
	);
}

function HeroCardCluster() {
	return (
		<div aria-hidden="true" className="pointer-events-none relative hidden h-[440px] lg:block">
			<div
				aria-hidden="true"
				className="absolute inset-8 -z-0 rounded-full bg-gradient-to-br from-oxblood/15 via-marigold/10 to-transparent blur-3xl"
			/>

			<ClusterSlot className="top-0 left-2 -rotate-2" delay="0.35s" floatDelayStyle={FLOAT_DELAY_0}>
				<ScoreCard />
			</ClusterSlot>

			<ClusterSlot
				className="top-[42%] left-1/2 -translate-x-1/2 rotate-[1.5deg]"
				delay="0.55s"
				floatDelayStyle={FLOAT_DELAY_2}
			>
				<LiveMentorCard />
			</ClusterSlot>

			<ClusterSlot className="right-0 bottom-2 -rotate-[1deg]" delay="0.75s" floatDelayStyle={FLOAT_DELAY_4}>
				<InterviewCard />
			</ClusterSlot>
		</div>
	);
}

function ClusterSlot({
	children,
	className,
	delay,
	floatDelayStyle,
}: {
	children: React.ReactNode;
	className: string;
	delay: string;
	floatDelayStyle: React.CSSProperties;
}) {
	return (
		<div className={`absolute origin-center ${className}`}>
			<div
				className="opacity-0 motion-safe:animate-[hero-card-in_0.7s_cubic-bezier(.2,.7,.2,1)_forwards]"
				style={{ animationDelay: delay }}
			>
				<div className="animate-float-slow" style={floatDelayStyle}>
					{children}
				</div>
			</div>
		</div>
	);
}

function ScoreCard() {
	return (
		<div className="w-[240px] rounded-sm border border-foreground/10 bg-card/85 p-3.5 shadow-[var(--shadow-floating)] backdrop-blur-md">
			<div className="mb-2.5 flex items-center gap-2.5">
				<span className="grid size-7 place-items-center rounded-full bg-oxblood text-background">
					<CheckIcon size={14} weight="bold" />
				</span>
				<div className="flex-1">
					<p className="font-display font-medium text-foreground text-sm leading-tight">CV pasó el filtro</p>
					<p className="font-mono text-[10px] text-foreground/70 uppercase tracking-[0.12em]">Score 94 / 100</p>
				</div>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
				<div className="h-full w-[94%] rounded-full bg-oxblood motion-safe:animate-[score-fill_1.6s_cubic-bezier(.2,.7,.2,1)_0.6s_both]" />
			</div>
		</div>
	);
}

function InterviewCard() {
	return (
		<div className="flex w-[230px] items-center gap-3 rounded-sm border border-foreground/12 bg-card/85 px-3.5 py-2.5 shadow-[var(--shadow-floating)] backdrop-blur-md">
			<span className="grid size-9 place-items-center rounded-full bg-marigold text-background">
				<CalendarCheckIcon size={16} weight="fill" />
			</span>
			<div>
				<p className="flex items-center gap-1.5 font-display font-medium text-foreground text-sm leading-tight">
					Entrevista agendada
					<SparkleIcon className="text-marigold" size={11} weight="fill" />
				</p>
				<p className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.12em]">
					Mercado Libre · Vie 14:00
				</p>
			</div>
		</div>
	);
}

function LiveMentorCard() {
	return (
		<div className="flex w-[250px] items-center gap-3 rounded-sm border border-foreground/12 bg-card/85 px-3.5 py-2.5 shadow-[var(--shadow-floating)] backdrop-blur-md">
			<span aria-hidden="true" className="relative block size-9 shrink-0 rounded-full bg-oxblood/15">
				<span className="absolute right-0 bottom-0 grid size-3 place-items-center rounded-full bg-card">
					<span className="size-2 rounded-full bg-oxblood motion-safe:animate-[live-pulse_1.8s_ease-in-out_infinite]" />
				</span>
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate font-display font-medium text-foreground text-sm leading-tight">
					<span className="font-display-italic font-light text-oxblood">Sofía</span> revisó tu CV
				</p>
				<p className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.12em]">3 mejoras · hace 2 min</p>
			</div>
		</div>
	);
}

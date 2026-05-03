import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";

const TERMS: readonly string[] = [
	"90 días desde tu primera sesión.",
	"Aplicaste a 25+ ofertas relevantes con tu CV reescrito.",
	"Asististe a tus sesiones agendadas.",
	"Si nada de eso convirtió en entrevista: devolvemos el 100%.",
];

export function Guarantee() {
	return (
		<section className="px-6 py-24" id="garantia">
			<div className="mx-auto max-w-[1200px]">
				<div className="mb-10 flex items-center gap-3">
					<span className="font-display-italic text-2xl text-oxblood leading-none">§05</span>
					<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
					<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
						El pacto editorial
					</span>
				</div>

				<div className="relative grid items-stretch gap-0 overflow-hidden rounded-sm border border-foreground/10 bg-card md:grid-cols-[1.3fr_1fr]">
					<div className="relative p-10 md:p-14">
						<span className="font-mono text-[10px] text-oxblood uppercase tracking-[0.22em]">Nuestra garantía</span>
						<h2 className="mt-4 font-display font-medium text-[clamp(2.4rem,5vw,4.4rem)] text-foreground leading-[0.94] tracking-[-0.045em]">
							En <span className="font-display-italic font-light text-oxblood">90 días</span> <br />
							tenés entrevistas.
							<br />
							<span className="text-foreground/55">O te devolvemos</span>
							<br />
							el{" "}
							<span className="relative inline-block">
								<span className="font-display-italic font-light text-oxblood">100%.</span>
								<svg
									aria-hidden="true"
									className="absolute -bottom-[0.18em] left-1/2 w-[110%] -translate-x-1/2"
									fill="none"
									preserveAspectRatio="none"
									viewBox="0 0 200 16"
								>
									<title>flourish</title>
									<path
										d="M4 10 Q 50 2, 100 8 T 196 6"
										stroke="var(--oxblood)"
										strokeLinecap="round"
										strokeWidth="2.5"
									/>
								</svg>
							</span>
						</h2>

						<p className="mt-8 max-w-[480px] font-serif text-[1.1rem] text-foreground/75 italic leading-[1.5]">
							No vendemos un curso ni una plantilla. Vendemos un resultado: que llegue la entrevista que estás buscando
							— o no nos pagás un peso.
						</p>

						<div className="mt-10 flex flex-wrap items-center gap-3">
							<a className={buttonVariants({ size: "lg" })} href="#planes">
								Empezar con el plan Signature
								<ArrowRightIcon weight="bold" />
							</a>
							<a
								className="inline-flex h-10 items-center gap-2 px-2 font-medium text-foreground text-sm underline decoration-2 decoration-oxblood/50 underline-offset-[6px] transition hover:decoration-oxblood"
								href="#faq"
							>
								Ver cómo aplica
							</a>
						</div>
					</div>

					<div className="relative flex flex-col justify-between border-foreground/10 border-t bg-[oklch(0.18_0.02_40)] p-10 text-[oklch(0.94_0.01_78)] md:border-t-0 md:border-l">
						<span
							aria-hidden="true"
							className="pointer-events-none absolute -top-1/3 -right-1/3 size-[120%] rounded-full bg-[radial-gradient(circle,_var(--oxblood)_0%,_transparent_55%)] opacity-50 mix-blend-screen"
						/>
						<span
							aria-hidden="true"
							className="pointer-events-none absolute -bottom-1/3 -left-1/4 size-[110%] rounded-full bg-[radial-gradient(circle,_var(--marigold)_0%,_transparent_55%)] opacity-25 mix-blend-screen"
						/>

						<div className="relative">
							<div className="flex items-baseline justify-between">
								<span className="font-mono text-[10px] text-[oklch(0.78_0.16_65)] uppercase tracking-[0.22em]">
									Cláusulas
								</span>
								<span className="font-mono text-[10px] text-white/45 uppercase tracking-[0.18em]">Plan Signature</span>
							</div>

							<ul className="mt-6 flex flex-col">
								{TERMS.map((term, idx) => (
									<li
										className="flex items-start gap-3 border-white/10 border-b py-3.5 text-[0.95rem] leading-snug last:border-b-0"
										key={term}
									>
										<span className="mt-0.5 font-mono text-[10px] text-[oklch(0.78_0.16_65)] uppercase tabular-nums tracking-[0.14em]">
											{String(idx + 1).padStart(2, "0")}
										</span>
										<CheckIcon className="mt-0.5 shrink-0 text-[oklch(0.78_0.16_65)]" size={14} weight="bold" />
										<span className="text-white/90">{term}</span>
									</li>
								))}
							</ul>
						</div>

						<div className="relative mt-10 flex items-end justify-between gap-6">
							<div>
								<p className="font-display-italic font-light text-2xl text-[oklch(0.78_0.16_65)] leading-[1.1]">
									— el equipo stackcv
								</p>
								<p className="mt-2 font-mono text-[10px] text-white/45 uppercase tracking-[0.2em]">
									Buenos Aires · Bogotá · 2026
								</p>
							</div>

							<svg
								aria-hidden="true"
								className="size-24 shrink-0 text-[oklch(0.78_0.16_65)]"
								fill="none"
								viewBox="0 0 120 120"
							>
								<title>seal</title>
								<path
									d="M60 8 L 71 26 L 92 22 L 90 42 L 110 50 L 96 66 L 108 84 L 88 86 L 86 106 L 68 96 L 50 104 L 46 84 L 26 80 L 34 64 L 18 50 L 36 38 L 34 18 L 54 22 Z"
									fill="currentColor"
									opacity="0.18"
								/>
								<path
									d="M60 8 L 71 26 L 92 22 L 90 42 L 110 50 L 96 66 L 108 84 L 88 86 L 86 106 L 68 96 L 50 104 L 46 84 L 26 80 L 34 64 L 18 50 L 36 38 L 34 18 L 54 22 Z"
									opacity="0.5"
									stroke="currentColor"
									strokeWidth="1.2"
								/>
								<text
									dominantBaseline="middle"
									fill="currentColor"
									fontFamily="Fraunces, serif"
									fontSize="22"
									fontStyle="italic"
									fontWeight="500"
									letterSpacing="-0.04em"
									textAnchor="middle"
									x="60"
									y="62"
								>
									100%
								</text>
								<text
									dominantBaseline="middle"
									fill="currentColor"
									fontFamily="Fraunces, serif"
									fontSize="9"
									fontWeight="400"
									letterSpacing="0.18em"
									textAnchor="middle"
									x="60"
									y="78"
								>
									GARANTÍA
								</text>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

import { HOW_STEPS } from "./data";

export function HowItWorks() {
	return (
		<section className="px-6 py-32" id="camino">
			<div className="mx-auto mb-20 grid max-w-[1200px] gap-6 md:grid-cols-12">
				<div className="md:col-span-7">
					<div className="flex items-center gap-3">
						<span className="font-mono text-[11px] text-oxblood uppercase tabular-nums tracking-[0.22em]">§03</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
							De CV a contrato
						</span>
					</div>
					<h2 className="mt-5 font-bold font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1] tracking-[-0.035em]">
						El camino completo del usuario{" "}
						<span className="font-display-italic font-semibold text-oxblood">Premium</span>.
					</h2>
				</div>
				<div className="flex items-end md:col-span-4 md:col-start-9">
					<p className="text-[15px] text-foreground/75 leading-[1.55]">
						Las herramientas IA hacen el trabajo de fondo. El coach hace que cada paso pegue. Resultado: ofertas reales
						en semanas, no meses.
					</p>
				</div>
			</div>

			<ol className="relative mx-auto max-w-[1200px]">
				<span
					aria-hidden="true"
					className="pointer-events-none absolute top-[36px] right-[6%] left-[6%] hidden h-px bg-[length:8px_1px] bg-[linear-gradient(to_right,var(--rule)_0,var(--rule)_60%,transparent_60%,transparent_100%)] md:block"
				/>
				<div className="grid grid-cols-1 gap-y-12 md:grid-cols-6 md:gap-x-5">
					{HOW_STEPS.map((step, idx) => (
						<li className="group relative flex flex-col" key={step.title}>
							<div className="relative z-10 mb-5 flex h-[72px] items-center">
								<span className="relative grid size-[72px] shrink-0 place-items-center rounded-full border border-foreground/15 bg-background font-bold font-display text-[1.5rem] text-foreground transition group-hover:border-oxblood group-hover:bg-foreground group-hover:text-background">
									<span className="tabular-nums leading-none">{String(idx + 1).padStart(2, "0")}</span>
								</span>
							</div>
							{step.tag && (
								<span className="mb-2 inline-flex w-fit rounded-full bg-oxblood/10 px-2.5 py-0.5 font-mono text-[9px] text-oxblood uppercase tracking-[0.14em]">
									{step.tag}
								</span>
							)}
							<h3 className="mb-2 font-bold font-display text-[1.05rem] text-foreground tracking-[-0.015em]">
								{step.title}
							</h3>
							<p className="max-w-[260px] text-[13.5px] text-foreground/65 leading-[1.55]">{step.body}</p>
						</li>
					))}
				</div>
			</ol>
		</section>
	);
}

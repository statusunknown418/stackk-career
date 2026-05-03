import { HOW_STEPS } from "./data";

export function HowItWorks() {
	return (
		<section className="px-6 py-32" id="nosotros">
			<div className="mx-auto mb-20 grid max-w-[1200px] gap-6 md:grid-cols-12">
				<div className="md:col-span-7">
					<div className="flex items-center gap-3">
						<span className="font-display-italic text-2xl text-oxblood leading-none">§03</span>
						<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
						<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">Cómo funciona</span>
					</div>
					<h2 className="mt-5 font-display font-medium text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[0.98] tracking-[-0.04em]">
						Cuatro pasos. <span className="font-display-italic font-light text-oxblood">Cero</span> sorpresas.
					</h2>
				</div>
				<div className="flex items-end md:col-span-4 md:col-start-9">
					<p className="font-serif text-foreground/75 text-lg leading-[1.5]">
						No hay scripts ni AI. Hay personas que se sientan con vos hasta que la versión sale bien.
					</p>
				</div>
			</div>

			<ol className="relative mx-auto max-w-[1200px]">
				<span
					aria-hidden="true"
					className="pointer-events-none absolute top-[36px] right-[6%] left-[6%] hidden h-px bg-[length:8px_1px] bg-[linear-gradient(to_right,var(--rule)_0,var(--rule)_60%,transparent_60%,transparent_100%)] md:block"
				/>
				<div className="grid grid-cols-2 gap-y-14 md:grid-cols-4 md:gap-x-6">
					{HOW_STEPS.map((step, idx) => (
						<li className="group relative flex flex-col" key={step.title}>
							<div className="relative z-10 mb-6 flex h-[72px] items-center">
								<span className="relative grid size-[72px] shrink-0 place-items-center rounded-full border border-foreground/15 bg-background font-display text-[2rem] text-foreground transition group-hover:border-oxblood group-hover:bg-foreground group-hover:text-background">
									<span className="font-display-italic font-light leading-none">
										{String(idx + 1).padStart(2, "0")}
									</span>
								</span>
							</div>
							<h3 className="mb-2 font-display font-medium text-[1.25rem] text-foreground tracking-[-0.02em]">
								{step.title}
							</h3>
							<p className="max-w-[260px] text-foreground/65 text-sm leading-relaxed">{step.body}</p>
						</li>
					))}
				</div>
			</ol>
		</section>
	);
}

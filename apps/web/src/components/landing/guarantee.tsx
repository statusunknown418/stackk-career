import { CheckIcon, XIcon } from "@phosphor-icons/react";

interface CompareRow {
	feature: string;
	highlight?: boolean;
	impulsa: string;
	wonsulting: string | false;
}

const COMPARE: readonly CompareRow[] = [
	{
		feature: "Score CV con IA (vs. oferta laboral)",
		wonsulting: "Solo en ResumAI premium",
		impulsa: "Incluido desde S/79",
		highlight: true,
	},
	{
		feature: "Carta de presentación IA ilimitada",
		wonsulting: "CoverLetterAI separado",
		impulsa: "Incluido en Pro",
	},
	{
		feature: "Optimizador de LinkedIn",
		wonsulting: "Servicio aparte",
		impulsa: "Incluido en Pro",
	},
	{
		feature: "Mensajes de outreach a recruiters",
		wonsulting: "NetworkAI separado",
		impulsa: "Incluido en Pro",
	},
	{
		feature: "Coaching 1:1 humano (3 sesiones)",
		wonsulting: "$699 – $2,299 USD aparte",
		impulsa: "S/179/mes en Premium",
		highlight: true,
	},
	{
		feature: "WhatsApp directo con tu coach",
		wonsulting: false,
		impulsa: "Incluido en Premium",
	},
	{
		feature: "Coaches LATAM (español neutro)",
		wonsulting: false,
		impulsa: "3–5 coaches peruanos senior",
		highlight: true,
	},
];

export function Compare() {
	return (
		<section className="px-6 py-24" id="comparativa">
			<div className="mx-auto max-w-[1200px]">
				<div className="mb-10 grid gap-6 md:grid-cols-12">
					<div className="md:col-span-7">
						<div className="flex items-center gap-3">
							<span className="font-mono text-[11px] text-oxblood uppercase tabular-nums tracking-[0.22em]">§05</span>
							<span className="h-px max-w-[80px] flex-1 bg-foreground/20" />
							<span className="font-mono text-[10px] text-foreground/60 uppercase tracking-[0.22em]">
								Lo que pagás aparte en el resto
							</span>
						</div>
						<h2 className="mt-5 font-bold font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1] tracking-[-0.035em]">
							Wonsulting cobra el coaching{" "}
							<span className="font-display-italic font-semibold text-oxblood">aparte</span>.
							<br />
							Acá viene <span className="font-display-italic font-semibold text-oxblood">incluido</span>.
						</h2>
					</div>
					<div className="flex items-end md:col-span-4 md:col-start-9">
						<p className="text-[15px] text-foreground/75 leading-[1.55]">
							La gran ventaja de IMPULSA: las herramientas IA y el coaching humano no se compran por separado. Una
							suscripción mensual cubre todo.
						</p>
					</div>
				</div>

				<div className="overflow-hidden rounded-2xl border border-foreground/10 bg-card">
					<div className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-4 border-foreground/10 border-b bg-foreground/[0.02] px-6 py-5">
						<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.18em]">Feature</span>
						<div className="flex items-center justify-end gap-2 text-right md:justify-start md:text-left">
							<span className="hidden font-mono text-[10px] text-foreground/55 uppercase tracking-[0.16em] md:inline">
								Wonsulting (USA)
							</span>
							<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.16em] md:hidden">
								Wonsulting
							</span>
						</div>
						<div className="flex items-center justify-end gap-2 md:justify-start">
							<span
								aria-hidden="true"
								className="grid size-5 place-items-center rounded-md bg-oxblood font-display font-extrabold text-[10px] text-white"
							>
								i
							</span>
							<span className="font-bold font-display text-foreground text-sm tracking-[-0.01em]">IMPULSA</span>
						</div>
					</div>

					<ul className="flex flex-col">
						{COMPARE.map((row) => (
							<li
								className={`grid grid-cols-[1.4fr_1fr_1fr] items-center gap-4 border-foreground/8 border-b px-6 py-4 last:border-b-0 ${row.highlight ? "bg-oxblood/[0.04]" : ""}`}
								key={row.feature}
							>
								<span className="text-[14px] text-foreground/85 leading-snug">{row.feature}</span>
								<span className="flex items-center gap-2 text-[13px]">
									{row.wonsulting === false ? (
										<>
											<XIcon className="text-foreground/35" size={14} weight="bold" />
											<span className="text-foreground/45">No disponible</span>
										</>
									) : (
										<span className="text-foreground/65">{row.wonsulting}</span>
									)}
								</span>
								<span className="flex items-center gap-2 text-[13px]">
									<CheckIcon className="text-oxblood" size={14} weight="bold" />
									<span className="font-medium text-foreground">{row.impulsa}</span>
								</span>
							</li>
						))}
					</ul>

					<div className="grid items-center gap-4 border-foreground/10 border-t bg-foreground/[0.02] px-6 py-5 md:grid-cols-[1.4fr_1fr_1fr]">
						<span className="font-bold font-display text-foreground text-sm">Costo total estimado</span>
						<span className="font-bold font-display text-base text-foreground/45 line-through">$1.500+ USD</span>
						<span className="flex items-baseline gap-1.5">
							<span className="font-bold font-display text-[1rem] text-oxblood leading-none">S/</span>
							<span className="font-display font-extrabold text-[1.6rem] text-foreground tabular-nums leading-none tracking-[-0.025em]">
								179
							</span>
							<span className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.14em]">
								/ mes · Premium
							</span>
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}

export const Guarantee = Compare;

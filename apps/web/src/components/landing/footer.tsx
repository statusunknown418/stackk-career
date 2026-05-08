import { FOOTER_COLUMNS } from "./data";

export function LandingFooter() {
	return (
		<footer className="mx-auto max-w-[1200px] border-foreground/10 border-t px-6 pt-20 pb-10">
			<div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
				<div className="col-span-2 md:col-span-1">
					<div className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className="grid size-9 place-items-center rounded-lg bg-foreground font-bold font-display text-[15px] text-background leading-none"
						>
							i
						</span>
						<span className="font-bold font-display text-2xl text-foreground tracking-[-0.02em]">IMPULSA</span>
					</div>
					<p className="mt-4 max-w-[280px] text-[14px] text-foreground/70 leading-[1.55]">
						Plataforma de empleo con IA + coaching humano. Hecho en Perú, para todo LATAM. Garantizamos tu próxima
						entrevista en menos de 3 meses.
					</p>
				</div>

				{FOOTER_COLUMNS.map((col) => (
					<div key={col.heading}>
						<h5 className="mb-5 font-medium text-[13px] text-foreground/55">{col.heading}</h5>
						<ul className="flex flex-col gap-2.5">
							{col.links.map((link) => (
								<li key={link.label}>
									<a
										className="text-[14px] text-foreground/75 transition-colors hover:text-foreground"
										href={link.href}
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>

			<div className="mt-16 flex flex-col items-start justify-between gap-4 border-foreground/10 border-t pt-8 md:flex-row md:items-center">
				<p className="text-foreground/55 text-sm">© 2026 IMPULSA · Lima · Bogotá · CDMX</p>
			</div>
		</footer>
	);
}

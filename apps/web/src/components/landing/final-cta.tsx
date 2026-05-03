import { ArrowRightIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FinalCta() {
	return (
		<section className="px-6 py-24">
			<div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-foreground px-10 py-24 text-background">
				<span
					aria-hidden="true"
					className="pointer-events-none absolute -top-1/2 -left-[10%] h-[200%] w-[70%] animate-orbit-slow rounded-full bg-[radial-gradient(circle,_var(--oxblood)_0%,_transparent_55%)] opacity-50 mix-blend-screen"
				/>
				<span
					aria-hidden="true"
					className="pointer-events-none absolute -right-[5%] -bottom-1/3 h-[150%] w-[60%] rounded-full bg-[radial-gradient(circle,_var(--marigold)_0%,_transparent_55%)] opacity-25 mix-blend-screen"
				/>

				<div className="relative z-10 grid items-end gap-10 md:grid-cols-12">
					<div className="md:col-span-8">
						<div className="flex items-center gap-3 font-mono text-[10px] text-background/55 uppercase tracking-[0.22em]">
							<span className="size-1.5 rounded-full bg-marigold" />
							Tu siguiente paso
							<span className="h-px max-w-[80px] flex-1 bg-background/20" />
						</div>

						<h2 className="mt-6 font-bold font-display text-[clamp(2.4rem,6vw,5rem)] leading-[1] tracking-[-0.04em]">
							Subí tu CV.
							<br />
							Ve tu{" "}
							<span className="relative inline-block">
								<span className="font-display-italic font-semibold text-marigold">score</span>
								<svg
									aria-hidden="true"
									className="absolute -bottom-[0.15em] left-1/2 w-[110%] -translate-x-1/2"
									fill="none"
									preserveAspectRatio="none"
									viewBox="0 0 200 16"
								>
									<title>flourish</title>
									<path
										d="M4 10 Q 50 2, 100 8 T 196 6"
										stroke="var(--marigold)"
										strokeLinecap="round"
										strokeWidth="2.5"
									/>
								</svg>
							</span>
							. Mejorá hoy.
						</h2>

						<p className="mt-6 max-w-[540px] text-[17px] text-background/85 leading-[1.55]">
							Score CV gratis para siempre. Sin tarjeta, sin compromiso. Si querés más, Pro arranca en S/79/mes (≈$21
							USD).
						</p>
					</div>

					<div className="flex flex-col gap-3 md:col-span-4 md:items-end">
						<a
							className={cn(
								buttonVariants({ size: "lg" }),
								"border-marigold bg-marigold text-white hover:bg-marigold/90"
							)}
							href="#planes"
						>
							Subí tu CV gratis
							<ArrowRightIcon weight="bold" />
						</a>
						<a
							className="inline-flex h-9 items-center gap-2 px-2 font-medium text-background/85 text-sm underline decoration-2 decoration-marigold/60 underline-offset-[6px] transition hover:text-background hover:decoration-marigold"
							href="#planes"
						>
							Ver planes y precios
						</a>

						<p className="mt-4 font-mono text-[10px] text-background/45 uppercase tracking-[0.2em]">
							Score 100% gratis · 1/mes
						</p>
					</div>
				</div>

				<div className="relative z-10 mt-14 flex items-baseline justify-between border-background/15 border-t pt-4 font-mono text-[10px] text-background/50 uppercase tracking-[0.22em]">
					<span>impulsa</span>
					<span className="hidden sm:inline">Hecho en Perú · Para todo LATAM</span>
					<span className="font-display-italic font-medium not-italic">2026</span>
				</div>
			</div>
		</section>
	);
}

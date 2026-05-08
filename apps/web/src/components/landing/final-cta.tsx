import { ArrowRightIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { PixelGridShader } from "@/components/ui/pixelgrid-shader";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export function FinalCta() {
	return (
		<section className="px-6 py-24">
			<Reveal className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-foreground text-background">
				<div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06]">
					<PixelGridShader amplitude={0.25} colorFg="#ffffff" pxSize={4} rings={6} shape="scan" speed={0.1} />
				</div>
				<div className="relative z-10 flex flex-col items-start gap-10 px-10 py-24 md:items-center md:px-16 md:text-center">
					<h2 className="max-w-[20ch] font-bold font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.95] tracking-[-0.04em]">
						Tu próxima oferta empieza con un score.
					</h2>

					<p className="max-w-[540px] text-[1.05rem] text-background/70 leading-[1.55]">
						Score CV gratis para siempre. Sin tarjeta, sin compromiso. Si quieres más, Pro empieza en S/79/mes (≈
						US$21).
					</p>

					<div className="flex flex-wrap items-center gap-3 md:justify-center">
						<a
							className={cn(buttonVariants({ size: "lg" }), "bg-background text-foreground hover:bg-background/90")}
							href="#planes"
						>
							Analiza mi CV gratis
							<ArrowRightIcon weight="bold" />
						</a>
						<a
							className="inline-flex h-11 items-center gap-2 px-2 font-medium text-background/80 transition hover:text-background"
							href="#planes"
						>
							Ver planes y precios
						</a>
					</div>
				</div>
			</Reveal>
		</section>
	);
}

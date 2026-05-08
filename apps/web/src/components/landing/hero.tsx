import { ArrowRightIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { buttonVariants } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { PixelGridShader } from "@/components/ui/pixelgrid-shader";
import { LogoCarousel } from "../ui/logo-carousel";

export function Hero() {
	return (
		<>
			<section className="relative flex min-h-[88vh] items-center overflow-hidden px-6 pt-28 pb-16" id="top">
				<AuroraBackground />
				<div className="absolute inset-0 opacity-[0.14] mix-blend-multiply">
					<PixelGridShader
						amplitude={0.3}
						colorFg="#3a0a5e"
						cursorMode="ripple"
						cursorScale={0.4}
						cursorSize={0.35}
						frequency={1.4}
						pxSize={4}
						rings={5}
						shape="ripple"
						speed={0.25}
					/>
				</div>
				<div className="relative z-10 mx-auto w-full max-w-[1200px]">
					<h1 className="font-bold font-display text-[clamp(3rem,9vw,8.5rem)] text-foreground leading-[0.95] tracking-[-0.04em]">
						Garantizamos tu próxima entrevista
						<br />
						en menos de 3 meses.
					</h1>

					<p className="mt-10 max-w-[640px] text-[clamp(1.05rem,1.4vw,1.25rem)] text-foreground/65 leading-[1.5]">
						IA que arregla tu CV en segundos + coach senior que te acompaña paso a paso. Si no consigues entrevista, te
						devolvemos el 100%. Hecho para LATAM.
					</p>

					<div className="mt-12 flex flex-wrap items-center gap-3">
						<a className={buttonVariants({ size: "lg" })} href="#planes">
							<UploadSimpleIcon weight="bold" />
							Analiza mi CV gratis
						</a>
						<a
							className="inline-flex h-11 items-center gap-2 px-2 font-medium text-foreground/80 transition hover:text-foreground"
							href="#planes"
						>
							Ver planes
							<ArrowRightIcon weight="bold" />
						</a>
					</div>

					<dl className="mt-20 flex flex-wrap items-baseline gap-x-12 gap-y-4 border-foreground/10 border-t pt-8 text-foreground/60 text-sm">
						<HeroStat label="CVs analizados">
							<CountUp suffix="+" to={2400} />
						</HeroStat>
						<HeroStat label="en 380 reseñas verificadas">
							<CountUp decimals={1} suffix="/5" to={4.9} />
						</HeroStat>
						<HeroStat label="países en LATAM">
							<CountUp to={8} />
						</HeroStat>
					</dl>
				</div>
			</section>

			<section className="border-foreground/5 border-t px-6 py-16">
				<div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6">
					<span className="text-foreground/50 text-sm">Mentees ahora trabajan en</span>
					<LogoCarousel />
				</div>
			</section>
		</>
	);
}

function HeroStat({ children, label }: { children: React.ReactNode; label: string }) {
	return (
		<div className="flex items-baseline gap-2.5">
			<dt className="font-display font-semibold text-2xl text-foreground tabular-nums tracking-tight">{children}</dt>
			<dd>{label}</dd>
		</div>
	);
}

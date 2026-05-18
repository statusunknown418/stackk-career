"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { PixelGridShader } from "@/components/ui/pixelgrid-shader";
import { Reveal } from "@/components/ui/reveal";
import { WordReveal } from "@/components/ui/word-reveal";
import { cn } from "@/lib/utils";

export function FinalCta() {
	return (
		<section className="px-6 py-16 md:py-24">
			<Reveal className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-foreground text-background">
				<div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06]">
					<PixelGridShader amplitude={0.25} colorFg="#ffffff" pxSize={4} rings={6} shape="scan" speed={0.1} />
				</div>
				<div className="relative z-10 flex flex-col items-start gap-8 px-6 py-16 sm:px-10 sm:py-20 md:items-center md:px-16 md:py-24 md:text-center">
					<h2 className="max-w-[20ch] text-balance break-words font-bold font-display text-[clamp(2rem,7vw,6rem)] leading-[1] tracking-[-0.04em] sm:leading-[0.95]">
						<WordReveal>Empieza con un score honesto.</WordReveal>
					</h2>

					<div className="flex flex-wrap items-center gap-3 md:justify-center">
						<div className="relative">
							<motion.span
								animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.15, 0.9] }}
								aria-hidden="true"
								className="pointer-events-none absolute inset-0 -z-0 rounded-full bg-background/40 blur-2xl motion-reduce:hidden"
								transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
							/>
							<Magnetic radius={120} strength={0.3}>
								<a
									className={cn(
										buttonVariants({ size: "lg" }),
										"relative z-10 bg-background text-foreground hover:bg-background/90"
									)}
									href="/setup"
								>
									Analiza mi CV gratis
									<ArrowRightIcon weight="bold" />
								</a>
							</Magnetic>
						</div>
						<a
							className="inline-flex h-11 items-center gap-2 px-2 font-medium text-background/80 transition hover:text-background"
							href="#planes"
						>
							Ver planes
						</a>
					</div>

					<p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-background/55 uppercase tracking-[0.16em] md:justify-center">
						<span>Gratis · Sin tarjeta</span>
						<span aria-hidden="true" className="size-1 rounded-full bg-marigold/70" />
						<span>Más de 2,400 talentos en LATAM</span>
					</p>
				</div>
			</Reveal>
		</section>
	);
}

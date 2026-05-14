"use client";

import { cn } from "@/lib/utils";
import { WORDMARK_LOGOS, type WordmarkLogo } from "./wordmark-logos";

export function LogoMarqueeRows({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"relative w-full [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]",
				className
			)}
		>
			<div className="group/row [overflow-x:clip] [overflow-y:visible]">
				<div className="flex w-max animate-marquee items-center gap-12 will-change-transform md:gap-16 group-hover/row:[animation-play-state:paused]">
					{WORDMARK_LOGOS.map((logo) => (
						<LogoChip key={`a-${logo.name}`} logo={logo} />
					))}
					{WORDMARK_LOGOS.map((logo) => (
						<LogoChip key={`b-${logo.name}`} logo={logo} />
					))}
					{WORDMARK_LOGOS.map((logo) => (
						<LogoChip key={`c-${logo.name}`} logo={logo} />
					))}
				</div>
			</div>
		</div>
	);
}

function LogoChip({ logo }: { logo: WordmarkLogo }) {
	return (
		<span
			className={cn(
				"shrink-0 font-display text-[22px] text-foreground/55 leading-none tracking-tight transition-colors duration-300 hover:text-foreground/90 md:text-[26px]",
				logo.wordmarkClassName
			)}
		>
			{logo.wordmark ?? logo.name}
		</span>
	);
}

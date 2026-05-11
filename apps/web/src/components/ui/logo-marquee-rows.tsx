"use client";

import { cn } from "@/lib/utils";
import { WORDMARK_LOGOS, type WordmarkLogo } from "./wordmark-logos";

const ROW_CONFIGS: ReadonlyArray<{ animation: string; id: string }> = [
	{ id: "row-1", animation: "animate-marquee" },
	{ id: "row-2", animation: "animate-marquee-reverse-slow" },
	{ id: "row-3", animation: "animate-marquee-slow" },
];

function chunkRows<T>(items: readonly T[], rows: number): T[][] {
	const out: T[][] = Array.from({ length: rows }, () => []);
	items.forEach((item, i) => {
		out[i % rows].push(item);
	});
	return out;
}

export function LogoMarqueeRows({ className }: { className?: string }) {
	const rows = chunkRows(WORDMARK_LOGOS, ROW_CONFIGS.length);

	return (
		<div
			className={cn(
				"relative w-full [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]",
				className
			)}
		>
			<div className="flex flex-col gap-3 py-2">
				{ROW_CONFIGS.map((config, idx) => (
					<MarqueeRow animation={config.animation} items={rows[idx] ?? []} key={config.id} />
				))}
			</div>
		</div>
	);
}

function MarqueeRow({ animation, items }: { animation: string; items: WordmarkLogo[] }) {
	return (
		<div className="group/row overflow-hidden">
			<div
				className={cn(
					"flex w-max items-center gap-3 will-change-transform group-hover/row:[animation-play-state:paused]",
					animation
				)}
			>
				{items.map((logo) => (
					<LogoChip key={`a-${logo.name}`} logo={logo} />
				))}
				{items.map((logo) => (
					<LogoChip key={`b-${logo.name}`} logo={logo} />
				))}
				{items.map((logo) => (
					<LogoChip key={`c-${logo.name}`} logo={logo} />
				))}
			</div>
		</div>
	);
}

function LogoChip({ logo }: { logo: WordmarkLogo }) {
	return (
		<span className="flex shrink-0 items-center gap-2.5 rounded-full border border-foreground/8 bg-card/60 px-4 py-2 backdrop-blur-sm transition-colors hover:border-foreground/20 hover:bg-card">
			<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-oxblood/70" />
			<span
				className={cn(
					"font-display text-[18px] text-foreground/75 leading-none tracking-tight",
					logo.wordmarkClassName
				)}
			>
				{logo.wordmark ?? logo.name}
			</span>
		</span>
	);
}

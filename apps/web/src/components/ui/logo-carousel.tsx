/** biome-ignore-all lint/performance/noImgElement: tanstack start */
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentType, type SVGProps, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { GithubWordmarkDark } from "./svgs/github-wordmark-dark";
import { GithubWordmarkLight } from "./svgs/github-wordmark-light";
import { SanityWordmarkDark } from "./svgs/sanity-wordmark-dark";
import { SanityWordmarkLight } from "./svgs/sanity-wordmark-light";
import { SupabaseWordmarkDark } from "./svgs/supabase-wordmark-dark";
import { SupabaseWordmarkLight } from "./svgs/supabase-wordmark-light";
import { VercelWordmark } from "./svgs/vercel-wordmark";
import { VercelWordmarkDark } from "./svgs/vercel-wordmark-dark";

// ── Types ───────────────────────────────────────────────────────────

export interface LogoDef {
	height: number;
	Icon?: ComponentType<SVGProps<SVGSVGElement>>;
	name: string;
	src?: string;
	url?: string;
	width: number;
}

// ── Logo data ───────────────────────────────────────────────────────

const WORDMARK_HEIGHT = 32;

export const WORDMARK_LOGOS: LogoDef[] = [
	{ name: "GitHub", Icon: GithubWordmarkLight, url: "https://github.com", width: 118, height: WORDMARK_HEIGHT },
	{ name: "Vercel", Icon: VercelWordmark, url: "https://vercel.com", width: 161, height: WORDMARK_HEIGHT },
	{ name: "Sanity", Icon: SanityWordmarkLight, url: "https://sanity.io", width: 90, height: WORDMARK_HEIGHT },
	{ name: "Supabase", Icon: SupabaseWordmarkLight, url: "https://supabase.com", width: 165, height: WORDMARK_HEIGHT },
	{ name: "GitHub Dark", Icon: GithubWordmarkDark, url: "https://github.com", width: 118, height: WORDMARK_HEIGHT },
	{ name: "Vercel Dark", Icon: VercelWordmarkDark, url: "https://vercel.com", width: 161, height: WORDMARK_HEIGHT },
	{ name: "Sanity Dark", Icon: SanityWordmarkDark, url: "https://sanity.io", width: 90, height: WORDMARK_HEIGHT },
	{
		name: "Supabase Dark",
		Icon: SupabaseWordmarkDark,
		url: "https://supabase.com",
		width: 165,
		height: WORDMARK_HEIGHT,
	},
];

// ── Constants ───────────────────────────────────────────────────────

const SLOT_WIDTH = 240;
const INITIAL_DELAY = 1500;
const SLOT_STAGGER = 150;
const CYCLE_INTERVAL = 1500;

// ── Hooks ───────────────────────────────────────────────────────────

/** Returns responsive slot count: 1 on mobile, 2 on tablet, 3 on desktop. */
function useSlotCount(): number {
	const [count, setCount] = useState(3);

	useEffect(() => {
		const mqMd = window.matchMedia("(min-width: 768px)");
		const mqLg = window.matchMedia("(min-width: 1024px)");

		const update = () => {
			if (mqLg.matches) {
				setCount(3);
			} else if (mqMd.matches) {
				setCount(2);
			} else {
				setCount(1);
			}
		};

		update();
		mqMd.addEventListener("change", update);
		mqLg.addEventListener("change", update);

		return () => {
			mqMd.removeEventListener("change", update);
			mqLg.removeEventListener("change", update);
		};
	}, []);

	return count;
}

/** Resolves `true` once every image in `srcs` has loaded (or errored). */
function useImagesPreloaded(srcs: readonly string[]): boolean {
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;

		Promise.all(
			srcs.map(
				(src) =>
					new Promise<void>((resolve) => {
						const img = new window.Image();
						img.onload = () => resolve();
						img.onerror = () => resolve();
						img.src = src;
					})
			)
		).then(() => {
			if (!cancelled) {
				setLoaded(true);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [srcs]);

	return loaded;
}

/**
 * Cycles through a list of logos.
 * Pauses when the tab is hidden so staggered delays stay in sync on return.
 */
function useLogoCycle(logos: LogoDef[], initialDelay: number, enabled: boolean) {
	const [step, setStep] = useState(0);
	const current = logos[step % logos.length];

	useEffect(() => {
		if (!enabled) {
			return;
		}

		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let startedAt = 0;
		let remaining = step === 0 ? initialDelay : CYCLE_INTERVAL;

		const schedule = (delay: number) => {
			remaining = delay;
			startedAt = Date.now();
			timeoutId = setTimeout(() => setStep((s) => s + 1), delay);
		};

		const pause = () => {
			if (timeoutId != null) {
				clearTimeout(timeoutId);
				timeoutId = null;
				remaining = Math.max(0, remaining - (Date.now() - startedAt));
			}
		};

		const onVisibilityChange = () => {
			if (document.hidden) {
				pause();
			} else {
				schedule(remaining);
			}
		};

		document.addEventListener("visibilitychange", onVisibilityChange);
		if (!document.hidden) {
			schedule(remaining);
		}

		return () => {
			if (timeoutId != null) {
				clearTimeout(timeoutId);
			}
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [enabled, step, initialDelay]);

	return { current, hasCycled: step > 0 };
}

// ── LogoSlot ────────────────────────────────────────────────────────

type CarouselVariant = "muted" | "dark";

const variantStyles: Record<CarouselVariant, { base: string; interactive: string }> = {
	muted: {
		base: "brightness-0 opacity-40 dark:invert",
		interactive: "transition-opacity duration-200 hover:opacity-60",
	},
	dark: {
		base: "brightness-0 dark:invert",
		interactive: "transition-opacity duration-200 opacity-80 hover:opacity-100",
	},
};

function LogoSlot({
	logos,
	slotIndex,
	slotHeight,
	enabled,
	disableLinks,
	variant = "muted",
}: {
	logos: LogoDef[];
	slotIndex: number;
	slotHeight: number;
	enabled: boolean;
	disableLinks?: boolean;
	variant?: CarouselVariant;
}) {
	const reducedMotion = useReducedMotion();
	const { current: logo, hasCycled } = useLogoCycle(logos, INITIAL_DELAY + slotIndex * SLOT_STAGGER, enabled);

	const styles = variantStyles[variant];
	const className = cn(styles.base, !disableLinks && styles.interactive);
	const visualEl = logo.Icon ? (
		<logo.Icon
			aria-label={disableLinks ? logo.name : undefined}
			className={className}
			height={logo.height}
			role="img"
			width={logo.width}
		/>
	) : (
		<img
			alt={disableLinks ? logo.name : ""}
			className={className}
			height={logo.height}
			src={logo.src}
			width={logo.width}
		/>
	);

	const getInitialAnimation = () => {
		if (hasCycled) {
			return reducedMotion ? { opacity: 0 } : { y: 20, opacity: 0, filter: "blur(8px)" };
		}
	};
	return (
		<section
			aria-label={logo.name}
			aria-roledescription="slide"
			className="flex items-center justify-center overflow-hidden"
			style={{
				width: SLOT_WIDTH,
				height: slotHeight + 40,
				marginBlock: -20,
			}}
		>
			<AnimatePresence initial={false} mode="popLayout">
				<motion.div
					animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1, filter: "blur(0px)" }}
					className="backface-hidden flex items-center justify-center will-change-[filter]"
					exit={reducedMotion ? { opacity: 0 } : { y: -20, opacity: 0, filter: "blur(8px)" }}
					initial={hasCycled ? getInitialAnimation() : false}
					key={logo.name}
					transition={{ duration: 0.5, ease: "easeInOut" }}
				>
					{disableLinks || !logo.url ? (
						visualEl
					) : (
						<a
							aria-label={`${logo.name} (opens in new tab)`}
							href={`${logo.url}?ref=arc`}
							rel="noopener noreferrer"
							target="_blank"
						>
							{visualEl}
						</a>
					)}
				</motion.div>
			</AnimatePresence>
		</section>
	);
}

// ── LogoCarousel ────────────────────────────────────────────────────

export function LogoCarousel({
	className,
	disableLinks,
	logos = WORDMARK_LOGOS,
	variant = "muted",
}: {
	className?: string;
	disableLinks?: boolean;
	logos?: LogoDef[];
	variant?: CarouselVariant;
}) {
	const srcs = useMemo(() => logos.map((l) => l.src).filter((s): s is string => Boolean(s)), [logos]);
	const allLoaded = useImagesPreloaded(srcs);
	const slotCount = useSlotCount();
	const slotHeight = useMemo(() => Math.max(...logos.map((l) => l.height)), [logos]);

	const slotLogos = useMemo(
		() => Array.from({ length: slotCount }, (_, slot) => logos.filter((_, i) => i % slotCount === slot)),
		[slotCount, logos]
	);

	return (
		<motion.div
			animate={{ opacity: allLoaded ? 1 : 0 }}
			aria-label="Companies we've partnered with"
			aria-roledescription="carousel"
			className={cn("flex items-center gap-4", className)}
			initial={{ opacity: 0 }}
			role="region"
			transition={{ duration: 0.4, ease: "easeOut" }}
		>
			{slotLogos.map((slotItems, i) => (
				<LogoSlot
					disableLinks={disableLinks}
					enabled={allLoaded}
					key={i.toString()}
					logos={slotItems}
					slotHeight={slotHeight}
					slotIndex={i}
					variant={variant}
				/>
			))}
		</motion.div>
	);
}

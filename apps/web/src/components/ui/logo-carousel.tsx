/** biome-ignore-all lint/performance/noImgElement: tanstack start */
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────

interface LogoDef {
	height: number;
	name: string;
	src: string;
	url: string;
	width: number;
}

// ── Logo data ───────────────────────────────────────────────────────

const LOGOS: LogoDef[] = [
	{ name: "Lantern", src: "/brands/lantern.svg", url: "https://withlantern.com", width: 186, height: 40 },
	{ name: "Sim", src: "/brands/sim.svg", url: "https://sim.ai", width: 84, height: 41 },
	{ name: "Langbase", src: "/brands/langbase.svg", url: "https://langbase.com", width: 202, height: 40 },
	{ name: "AgentMail", src: "/brands/agentmail.svg", url: "https://agentmail.to", width: 219, height: 40 },
	{ name: "Dot", src: "/brands/dot.svg", url: "https://bydot.studio", width: 114, height: 40 },
	{ name: "Fontface", src: "/brands/fontface.svg", url: "https://fontface.ai", width: 169, height: 40 },
	{ name: "Tesseract", src: "/brands/tesseract.svg", url: "https://x.com/usetesseract", width: 180, height: 50 },
	{ name: "Someone", src: "/brands/someone.svg", url: "https://someo.ne", width: 176, height: 30 },
	{ name: "Parrychain", src: "/brands/parrychain.svg", url: "https://parrychain.ai", width: 211, height: 25 },
];

// ── Constants ───────────────────────────────────────────────────────

const SLOT_WIDTH = 240;
const SLOT_HEIGHT = Math.max(...LOGOS.map((l) => l.height));
const INITIAL_DELAY = 2500;
const SLOT_STAGGER = 150;
const CYCLE_INTERVAL = 3000;

const LOGO_SRCS = LOGOS.map((l) => l.src);

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
	enabled,
	disableLinks,
	variant = "muted",
}: {
	logos: LogoDef[];
	slotIndex: number;
	enabled: boolean;
	disableLinks?: boolean;
	variant?: CarouselVariant;
}) {
	const reducedMotion = useReducedMotion();
	const { current: logo, hasCycled } = useLogoCycle(logos, INITIAL_DELAY + slotIndex * SLOT_STAGGER, enabled);

	const styles = variantStyles[variant];
	const imgEl = (
		<img
			alt={disableLinks ? logo.name : ""}
			className={cn(styles.base, !disableLinks && styles.interactive)}
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
				height: SLOT_HEIGHT + 40,
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
					{disableLinks ? (
						imgEl
					) : (
						<Link
							aria-label={`${logo.name} (opens in new tab)`}
							href={`${logo.url}?ref=arc`}
							rel="noopener noreferrer"
							target="_blank"
						>
							{imgEl}
						</Link>
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
	variant = "muted",
}: {
	className?: string;
	disableLinks?: boolean;
	variant?: CarouselVariant;
}) {
	const allLoaded = useImagesPreloaded(LOGO_SRCS);
	const slotCount = useSlotCount();

	const slotLogos = useMemo(
		() => Array.from({ length: slotCount }, (_, slot) => LOGOS.filter((_, i) => i % slotCount === slot)),
		[slotCount]
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
			{slotLogos.map((logos, i) => (
				<LogoSlot
					disableLinks={disableLinks}
					enabled={allLoaded}
					key={i.toString()}
					logos={logos}
					slotIndex={i}
					variant={variant}
				/>
			))}
		</motion.div>
	);
}

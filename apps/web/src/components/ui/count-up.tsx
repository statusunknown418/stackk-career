"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

interface CountUpProps {
	className?: string;
	decimals?: number;
	duration?: number;
	locale?: string;
	once?: boolean;
	prefix?: string;
	suffix?: string;
	to: number;
}

export function CountUp({
	to,
	duration = 1.6,
	className,
	prefix = "",
	suffix = "",
	decimals = 0,
	locale = "es-PE",
	once = false,
}: CountUpProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const inView = useInView(ref, { once, margin: "-15% 0px -15% 0px" });
	// Start at the target value so prerendered/SSR HTML (and crawlers) show the
	// real number instead of "0"; the count-up runs only once the element is in
	// view on the client.
	const motionValue = useMotionValue(to);
	const formatter = new Intl.NumberFormat(locale, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
	const rounded = useTransform(motionValue, (v) => `${prefix}${formatter.format(v)}${suffix}`);

	useEffect(() => {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (!inView) {
			if (!once) {
				motionValue.jump(to);
			}
			return;
		}
		if (reduced) {
			motionValue.jump(to);
			return;
		}
		motionValue.jump(0);
		const controls = animate(motionValue, to, { duration, ease: [0.16, 1, 0.3, 1] });
		return () => controls.stop();
	}, [inView, to, duration, motionValue, once]);

	return (
		<motion.span className={className} ref={ref}>
			{rounded}
		</motion.span>
	);
}

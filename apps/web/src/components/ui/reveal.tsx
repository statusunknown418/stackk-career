"use client";

import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface RevealProps extends HTMLMotionProps<"div"> {
	blur?: number;
	delay?: number;
	duration?: number;
	once?: boolean;
	y?: number;
}

export function Reveal({
	blur = 10,
	children,
	delay = 0,
	duration = 0.8,
	once = false,
	y = 28,
	...props
}: RevealProps) {
	const reduced = useReducedMotion();
	const isDesktop = useMediaQuery("md");
	const motionDisabled = Boolean(reduced) || !isDesktop;
	return (
		<motion.div
			initial={motionDisabled ? false : { opacity: 0, y, filter: `blur(${blur}px)` }}
			transition={motionDisabled ? { duration: 0 } : { duration, delay, ease: [0.16, 1, 0.3, 1] }}
			viewport={{ once, margin: "-10% 0px -10% 0px" }}
			whileInView={motionDisabled ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
			{...props}
		>
			{children}
		</motion.div>
	);
}

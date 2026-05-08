"use client";

import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";

interface RevealProps extends HTMLMotionProps<"div"> {
	delay?: number;
	duration?: number;
	once?: boolean;
	y?: number;
}

export function Reveal({ children, delay = 0, y = 24, duration = 0.7, once = false, ...props }: RevealProps) {
	const reduced = useReducedMotion();
	return (
		<motion.div
			initial={reduced ? false : { opacity: 0, y }}
			transition={reduced ? { duration: 0 } : { duration, delay, ease: [0.16, 1, 0.3, 1] }}
			viewport={{ once, margin: "-12% 0px -12% 0px" }}
			whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
			{...props}
		>
			{children}
		</motion.div>
	);
}

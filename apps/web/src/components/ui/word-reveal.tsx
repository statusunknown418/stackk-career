"use client";

import { motion, useReducedMotion } from "motion/react";

export function WordReveal({
	children,
	delayStart = 0,
	stagger = 0.055,
}: {
	children: string;
	delayStart?: number;
	stagger?: number;
}) {
	const reduced = useReducedMotion();
	if (reduced) {
		return <>{children}</>;
	}

	const words = children.split(" ");

	return (
		<>
			{words.map((word, i) => (
				<motion.span
					className="inline-block whitespace-pre"
					initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
					// biome-ignore lint/suspicious/noArrayIndexKey: words derived from stable split — order never changes
					key={`${word}-${i}`}
					transition={{ duration: 0.55, delay: delayStart + i * stagger, ease: [0.16, 1, 0.3, 1] }}
					viewport={{ once: false, margin: "-15% 0px" }}
					whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
				>
					{word}
					{i < words.length - 1 ? " " : ""}
				</motion.span>
			))}
		</>
	);
}

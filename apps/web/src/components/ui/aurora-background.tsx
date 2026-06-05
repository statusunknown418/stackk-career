"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
	className?: string;
}

export function AuroraBackground({ className }: AuroraBackgroundProps) {
	const { scrollYProgress } = useScroll();
	const opacity = useTransform(scrollYProgress, [0, 0.25, 0.55], [1, 0.7, 0.25]);
	const y1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
	const y2 = useTransform(scrollYProgress, [0, 1], [0, -90]);
	const y3 = useTransform(scrollYProgress, [0, 1], [0, 180]);

	return (
		<motion.div
			aria-hidden="true"
			className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
			style={{ opacity }}
		>
			<motion.div
				className="absolute -top-[20%] -left-[10%] size-[70%] animate-aurora-1 rounded-full bg-aurora-1 opacity-30 blur-2xl will-change-transform motion-reduce:animate-none"
				style={{ y: y1 }}
			/>
			<motion.div
				className="absolute top-[10%] -right-[15%] size-[65%] animate-aurora-2 rounded-full bg-aurora-2 opacity-25 blur-2xl will-change-transform motion-reduce:animate-none"
				style={{ y: y2 }}
			/>
			<motion.div
				className="absolute bottom-[-20%] left-[20%] size-[60%] animate-aurora-1 rounded-full bg-aurora-3 opacity-20 blur-2xl will-change-transform motion-reduce:animate-none"
				style={{ y: y3 }}
			/>
		</motion.div>
	);
}

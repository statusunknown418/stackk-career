"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";

interface UseMagneticOptions {
	radius?: number;
	strength?: number;
}

const DEFAULT_STRENGTH = 0.28;
const DEFAULT_RADIUS = 28;
const SPRING_CONFIG = { stiffness: 220, damping: 18, mass: 0.4 } as const;

export function useMagnetic(
	ref: RefObject<HTMLElement | null>,
	{ strength = DEFAULT_STRENGTH, radius = DEFAULT_RADIUS }: UseMagneticOptions = {}
) {
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const sx = useSpring(x, SPRING_CONFIG);
	const sy = useSpring(y, SPRING_CONFIG);
	const reduced = useReducedMotion();

	useEffect(() => {
		if (reduced) {
			x.set(0);
			y.set(0);
			return;
		}
		const el = ref.current;
		if (!el) {
			return;
		}

		const handleMove = (e: MouseEvent) => {
			const r = el.getBoundingClientRect();
			// Distance from the cursor to the button's edges — 0 when inside the
			// button, growing only once the cursor leaves it. The magnet engages
			// only within `radius` px of the edge, not a wide halo around it.
			const dxEdge = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
			const dyEdge = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
			if (Math.hypot(dxEdge, dyEdge) > radius) {
				x.set(0);
				y.set(0);
				return;
			}
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height / 2;
			x.set((e.clientX - cx) * strength);
			y.set((e.clientY - cy) * strength);
		};

		const handleReset = () => {
			x.set(0);
			y.set(0);
		};

		window.addEventListener("mousemove", handleMove);
		window.addEventListener("blur", handleReset);

		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("blur", handleReset);
		};
	}, [ref, strength, radius, x, y, reduced]);

	return { x: sx, y: sy };
}

interface MagneticProps {
	block?: boolean;
	children: ReactNode;
	className?: string;
	radius?: number;
	strength?: number;
}

export function Magnetic({ block = false, children, className, radius, strength }: MagneticProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const { x, y } = useMagnetic(ref, { radius, strength });

	return (
		<motion.span className={className} ref={ref} style={{ display: block ? "block" : "inline-flex", x, y }}>
			{children}
		</motion.span>
	);
}

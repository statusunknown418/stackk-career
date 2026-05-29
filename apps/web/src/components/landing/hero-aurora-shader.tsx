"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Green ambient glow behind the hero headline.
 *
 * Render tiers (cheapest first):
 *   1. Light mode → static CSS radial-gradient via `.hero-glow-light` (no JS, no GPU).
 *   2. Dark mode, mobile or reduced motion → static CSS radial-gradient via `.hero-glow-dark`.
 *   3. Dark mode, desktop, in viewport → WebGL MeshGradient from `@paper-design/shaders-react`.
 *
 * Perf gates that keep scroll smooth (measured on an M2 Pro, dark + desktop):
 *   - `useMediaQuery("md")` skips WebGL below 800px (no shader on mobile traffic, where GPU budget is tightest).
 *   - `useReducedMotion()` honors the OS pref — no shader when the user opted out of motion.
 *   - `useInView(ref, { margin: "300px 0px" })` unmounts the MeshGradient as soon as the hero
 *     leaves the viewport (and re-mounts 300px before it re-enters).
 *
 * MESH_COLORS are kept as JS constants because `<MeshGradient />` takes them as a prop;
 * the matching CSS gradients (the static fallback) live in `index.css` as `.hero-glow-*`
 * so the values are colocated with the rest of the brand color tokens.
 */
const MESH_COLORS = ["#0d120e", "#13301d", "#1f5130", "#37a559", "#0b0f0c"];

export function HeroAuroraShader() {
	const { theme } = useTheme();
	const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
	const isDark = theme === "dark" || (theme === "system" && systemDark);

	const reduced = useReducedMotion();
	const isDesktop = useMediaQuery("md");

	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { margin: "300px 0px" });

	const showShader = isDark && isDesktop && !reduced && inView;

	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" ref={ref}>
			{showShader ? (
				<div className="absolute inset-0 opacity-[0.68] [mask-image:radial-gradient(125%_110%_at_28%_22%,black_38%,transparent_82%)]">
					<MeshGradient
						colors={MESH_COLORS}
						distortion={1}
						speed={0.6}
						style={{ width: "100%", height: "100%" }}
						swirl={0.85}
					/>
				</div>
			) : (
				<div
					className={
						isDark ? "hero-glow-dark absolute inset-0 opacity-80" : "hero-glow-light absolute inset-0 opacity-90"
					}
				/>
			)}
		</div>
	);
}

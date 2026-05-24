"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// Green ambient glow behind the hero headline.
//   - Dark mode, desktop, in view: a flowing WebGL mesh gradient.
//   - Dark mode otherwise (mobile / reduced motion / scrolled away): static CSS glow.
//   - Light mode: an airy light-green CSS wash — no WebGL, clean on white paper.
// Two cost guards keep scroll smooth: WebGL never runs on mobile, and stops once
// the hero leaves the viewport.
const MESH_COLORS = ["#0d120e", "#13301d", "#1f5130", "#37a559", "#0b0f0c"];
const DARK_GLOW =
	"radial-gradient(125% 110% at 28% 22%, oklch(0.5 0.15 150 / 0.55), oklch(0.3 0.09 152 / 0.32) 40%, transparent 74%)";
const LIGHT_GLOW =
	"radial-gradient(125% 110% at 28% 20%, oklch(0.88 0.13 150 / 0.6), oklch(0.95 0.06 150 / 0.32) 42%, transparent 76%)";

// Tracks the resolved theme via the `light` class the ThemeProvider sets on <html>.
function useIsLight(): boolean {
	const [light, setLight] = useState(false);
	useEffect(() => {
		const el = document.documentElement;
		const sync = () => setLight(el.classList.contains("light"));
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(el, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);
	return light;
}

// True only on desktop with motion allowed — gates the expensive WebGL shader.
function useShaderCapable(): boolean {
	const reduced = useReducedMotion();
	const [capable, setCapable] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined" || reduced) {
			return;
		}
		const mq = window.matchMedia("(min-width: 768px)");
		const sync = () => setCapable(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, [reduced]);
	return capable;
}

export function HeroAuroraShader() {
	const isLight = useIsLight();
	const capable = useShaderCapable() && !isLight;
	const ref = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!capable || el === null || typeof IntersectionObserver === "undefined") {
			setInView(false);
			return;
		}
		const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
			rootMargin: "300px 0px",
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [capable]);

	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" ref={ref}>
			{capable && inView ? (
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
					className={isLight ? "absolute inset-0 opacity-90" : "absolute inset-0 opacity-80"}
					style={{ background: isLight ? LIGHT_GLOW : DARK_GLOW }}
				/>
			)}
		</div>
	);
}

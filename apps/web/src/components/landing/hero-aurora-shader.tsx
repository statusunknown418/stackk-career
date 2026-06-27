"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useInView } from "motion/react";
import { useRef } from "react";

/**
 * Green ambient glow behind the hero headline.
 *
 * Keep this deliberately matte. The hero already uses green as its brand
 * signal, so the shader should read as atmosphere instead of a neon wash.
 */
const MESH_COLORS = ["#0d110d", "#131912", "#1b2618", "#3d6d34", "#11140e"];

export function HeroAuroraShader() {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { margin: "300px 0px" });

	const showShader = inView;

	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden" ref={ref}>
			{showShader && (
				<div className="absolute -inset-20 opacity-75 mix-blend-screen [filter:saturate(0.78)_contrast(1.06)_brightness(0.88)]">
					<MeshGradient
						colors={MESH_COLORS}
						distortion={0.62}
						speed={0.55}
						style={{ width: "100%", height: "100%" }}
						swirl={0.22}
					/>
				</div>
			)}
		</div>
	);
}

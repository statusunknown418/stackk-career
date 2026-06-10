"use client";

import type { CSSProperties } from "react";
import type { DotAnimationResolver, DotMatrixCommonProps } from "@/lib/dotmatrix-core";
import { DotMatrixBase, diagonalSnakeNormFromIndex, diagonalSnakeOrderValue } from "@/lib/dotmatrix-core";
import { useDotMatrixPhases, usePrefersReducedMotion } from "@/lib/dotmatrix-hooks";

export type DotmSquare5Props = DotMatrixCommonProps;

const animationResolver: DotAnimationResolver = ({ isActive, index, reducedMotion, phase }) => {
	if (!isActive) {
		return { className: "dmx-inactive" };
	}

	const order = diagonalSnakeOrderValue(index);
	const pathNorm = diagonalSnakeNormFromIndex(index);
	const style = { "--dmx-diagonal-snake-order": order } as CSSProperties;

	if (reducedMotion || phase === "idle") {
		return {
			style: {
				...style,
				opacity: 0.16 + pathNorm * 0.78,
			},
		};
	}

	return { className: "dmx-diagonal-snake", style };
};

export function DotmSquare5({
	speed = 1.35,
	pattern = "full",
	animated = true,
	hoverAnimated = false,
	...rest
}: DotmSquare5Props) {
	const reducedMotion = usePrefersReducedMotion();
	const {
		phase: matrixPhase,
		onMouseEnter,
		onMouseLeave,
	} = useDotMatrixPhases({
		animated: Boolean(animated && !reducedMotion),
		hoverAnimated: Boolean(hoverAnimated && !reducedMotion),
		speed,
	});

	return (
		<DotMatrixBase
			{...rest}
			animated={animated}
			animationResolver={animationResolver}
			dotSize={rest.dotSize ?? 5}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			pattern={pattern}
			phase={matrixPhase}
			reducedMotion={reducedMotion}
			size={rest.size ?? 36}
			speed={speed}
		/>
	);
}

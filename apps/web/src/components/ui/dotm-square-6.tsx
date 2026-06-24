"use client";

import { type CSSProperties, useMemo } from "react";
import type { DotAnimationResolver, DotMatrixCommonProps } from "@/lib/dotmatrix-core";
import { DotMatrixBase } from "@/lib/dotmatrix-core";
import { useDotMatrixPhases, usePrefersReducedMotion } from "@/lib/dotmatrix-hooks";

export type DotmSquare6Props = DotMatrixCommonProps;

const COLUMN_HEIGHT = 5;

export function DotmSquare6({
	speed = 2.2,
	pattern = "full",
	animated = true,
	hoverAnimated = false,
	...rest
}: DotmSquare6Props) {
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

	const animationResolver = useMemo<DotAnimationResolver>(
		() =>
			({ isActive, row, col, phase }) => {
				if (!isActive) {
					return { className: "dmx-inactive" };
				}

				const goesUp = col % 2 === 0;
				const position = goesUp ? COLUMN_HEIGHT - 1 - row : row;

				if (reducedMotion || phase === "idle") {
					return { style: { opacity: 0.22 + (position / (COLUMN_HEIGHT - 1)) * 0.66 } };
				}

				return {
					className: "dmx-square6-col-snake",
					style: { "--dmx-col-pos": position } as CSSProperties,
				};
			},
		[reducedMotion]
	);

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

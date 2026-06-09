"use client";

import type { CSSProperties } from "react";
import type { DotMatrixCommonProps } from "@/lib/dotmatrix-core";
import {
	cx,
	dmxBloomHaloSpreadClass,
	dmxBloomRootActive,
	dmxDotBloomParts,
	remapOpacityToTriplet,
	resolveDmxColorTokens,
	styleOpacity,
	stylePx,
} from "@/lib/dotmatrix-core";
import { useDotMatrixPhases, usePrefersReducedMotion, useSteppedCycle } from "@/lib/dotmatrix-hooks";

export type DotmTriangle1Props = DotMatrixCommonProps;

const MATRIX_SIZE = 7;
const STEP_COUNT = 30;
const BASE_OPACITY = 0.08;
const CENTER_OPACITY = 0.24;
const TAIL_LEVELS = [0.96, 0.72, 0.52, 0.34, 0.2] as const;

const TRIANGLE_CELLS = new Set(["1,3", "2,2", "2,4", "3,1", "3,3", "3,5", "4,0", "4,2", "4,4", "4,6"]);

const CENTER_ROW = 3;
const CENTER_COL = 3;
const PERIMETER_PATH: ReadonlyArray<readonly [number, number]> = [
	[1, 3],
	[2, 2],
	[3, 1],
	[4, 0],
	[4, 2],
	[4, 4],
	[4, 6],
	[3, 5],
	[2, 4],
];

const MATRIX_CELLS = Array.from({ length: MATRIX_SIZE * MATRIX_SIZE }, (_, index) => {
	const row = Math.floor(index / MATRIX_SIZE);
	const col = index % MATRIX_SIZE;
	return { col, key: `${row}-${col}`, row } as const;
});

function isWithinTriangleMask(row: number, col: number): boolean {
	if (row < 0 || row >= MATRIX_SIZE || col < 0 || col >= MATRIX_SIZE) {
		return false;
	}

	// Staggered 1-2-3-4 triangle (base has exactly 4 cells), matching reference silhouette.
	return TRIANGLE_CELLS.has(`${row},${col}`);
}

function perimeterTailOpacity(row: number, col: number, head: number): number | undefined {
	for (const [trail, tailOpacity] of TAIL_LEVELS.entries()) {
		const idx = (head - trail + PERIMETER_PATH.length) % PERIMETER_PATH.length;
		const pathPoint = PERIMETER_PATH[idx];
		if (pathPoint === undefined) {
			continue;
		}
		const [pathRow, pathCol] = pathPoint;
		if (row === pathRow && col === pathCol) {
			return tailOpacity;
		}
	}
}

function resolveTriangleOpacity(row: number, col: number, isActive: boolean, frame: number): number {
	if (!isActive) {
		return 0;
	}

	const baseOpacity = row === CENTER_ROW && col === CENTER_COL ? CENTER_OPACITY : BASE_OPACITY;
	const head = Math.floor((frame / STEP_COUNT) * PERIMETER_PATH.length) % PERIMETER_PATH.length;
	return Math.max(baseOpacity, perimeterTailOpacity(row, col, head) ?? 0);
}

export function DotmTriangle1({
	size = 30,
	dotSize = 6.5,
	color = "currentColor",
	colorPreset,
	ariaLabel = "Loading",
	className,
	muted = false,
	bloom = false,
	halo = 0,
	dotClassName,
	dotShape = "circle",
	speed = 5,
	animated = true,
	hoverAnimated = false,
	cellPadding,
	opacityBase,
	opacityMid,
	opacityPeak,
}: DotmTriangle1Props) {
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
	const step = useSteppedCycle({
		active: !reducedMotion && matrixPhase !== "idle",
		cycleMsBase: 1650,
		steps: STEP_COUNT,
		speed,
	});

	const gap = cellPadding ?? Math.max(1, Math.floor((size - dotSize * MATRIX_SIZE) / (MATRIX_SIZE - 1)));
	const matrixSize = dotSize * MATRIX_SIZE + gap * (MATRIX_SIZE - 1);
	const { resolvedColor, dotFill } = resolveDmxColorTokens(color, colorPreset);
	const rootStyle = {
		width: stylePx(cellPadding == null ? size : matrixSize),
		height: stylePx(cellPadding == null ? size : matrixSize),
		["--dmx-dot-size" as const]: `${dotSize}px`,
		["--dmx-halo-level" as const]: halo,
		["--dmx-dot-fill" as const]: dotFill,
		color: resolvedColor,
	} as CSSProperties;

	return (
		<div
			aria-label={ariaLabel}
			aria-live="polite"
			className={cx(
				"dmx-root",
				`dmx-dot-shape-${dotShape}`,
				muted && "dmx-muted",
				dmxBloomRootActive(bloom, halo) && "dmx-bloom",
				dmxBloomHaloSpreadClass(halo),
				className
			)}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			role="status"
			style={rootStyle}
		>
			<div
				className="dmx-grid"
				style={{
					gap,
					gridTemplateColumns: `repeat(${MATRIX_SIZE}, minmax(0, 1fr))`,
					gridTemplateRows: `repeat(${MATRIX_SIZE}, minmax(0, 1fr))`,
				}}
			>
				{MATRIX_CELLS.map(({ col, key, row }) => {
					const isActive = isWithinTriangleMask(row, col);

					const frame = reducedMotion || matrixPhase === "idle" ? 0 : step;
					const opacity = resolveTriangleOpacity(row, col, isActive, frame);

					const dmxBloom = dmxDotBloomParts(isActive, opacity, bloom, halo, opacityBase, opacityMid, opacityPeak);

					return (
						<span
							aria-hidden="true"
							className={cx("dmx-dot", !isActive && "dmx-inactive", dmxBloom.bloomDot && "dmx-bloom-dot", dotClassName)}
							key={key}
							style={
								{
									width: stylePx(dotSize),
									height: stylePx(dotSize),
									opacity: styleOpacity(remapOpacityToTriplet(opacity, opacityBase, opacityMid, opacityPeak)),
									["--dmx-bloom-level" as const]: dmxBloom.level,
								} as CSSProperties
							}
						/>
					);
				})}
			</div>
		</div>
	);
}

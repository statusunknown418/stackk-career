import { useMotionValue, useSpring } from "motion/react";
import type { CSSProperties, ReactElement, SVGProps } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const DEFAULT_COLORS_PRIMARY = {
	danger: "#dc2626",
	warning: "#f59e0b",
	info: "#3b82f6",
	success: "#22c55e",
} as const;

const DEFAULT_COLORS_SECONDARY = {
	danger: "#fecaca",
	warning: "#fde68a",
	info: "#bfdbfe",
	success: "#bbf7d0",
} as const;

type DefaultColorMap = typeof DEFAULT_COLORS_PRIMARY | typeof DEFAULT_COLORS_SECONDARY;

function getDefaultColorByPercent(percent: number, colors: DefaultColorMap) {
	if (percent <= 25) {
		return colors.danger;
	}
	if (percent <= 50) {
		return colors.warning;
	}
	if (percent <= 75) {
		return colors.info;
	}
	return colors.success;
}

function resolveObjectColor(colorProp: { [key: number]: string }, checkValue: number, defaultColors: DefaultColorMap) {
	const keys = Object.keys(colorProp).sort((a, b) => Number(a) - Number(b));
	for (let i = 0; i < keys.length; i++) {
		const currentKey = Number(keys[i]);
		const nextKey = Number(keys[i + 1]);
		if (checkValue >= currentKey && (checkValue < nextKey || !nextKey)) {
			const color = colorProp[currentKey];
			return defaultColors[color as keyof DefaultColorMap] || color;
		}
	}
	return null;
}

export interface GaugeProps extends Omit<SVGProps<SVGSVGElement>, "className"> {
	className?:
		| string
		| {
				svgClassName?: string;
				primaryClassName?: string;
				secondaryClassName?: string;
				textClassName?: string;
				labelClassName?: string;
		  };
	equal?: boolean;
	gapPercent?: number;
	gaugeType?: "full" | "half" | "quarter";
	glowEffect?: boolean;
	gradient?: boolean;
	label?: string;
	max?: number;
	min?: number;
	multiRing?: {
		enabled: boolean;
		rings?: Array<{
			value: number;
			color: string;
			strokeWidth?: number;
			opacity?: number;
		}>;
	};
	primary?: "danger" | "warning" | "success" | "info" | string | { [key: number]: string };
	secondary?: "danger" | "warning" | "success" | "info" | string | { [key: number]: string };
	showPercentage?: boolean;
	showValue?: boolean;
	size?: number | string;
	strokeWidth?: number;
	thresholds?: Array<{
		value: number;
		color: string;
		label?: string;
	}>;
	tickMarks?: boolean;
	transition?: {
		length?: number;
		step?: number;
		delay?: number;
	};
	unit?: string;
	value: number;
}

export function Gauge({
	value,
	size = 150,
	gapPercent = 5,
	strokeWidth = 10,
	equal = false,
	showValue = true,
	showPercentage = false,
	primary,
	secondary,
	gradient = false,
	multiRing,
	thresholds,
	gaugeType = "full",
	transition = {
		length: 1000,
		step: 200,
		delay: 0,
	},
	className,
	label,
	unit = "%",
	min = 0,
	max = 100,
	tickMarks = false,
	glowEffect = false,
	...props
}: GaugeProps) {
	const circleSize = 100;
	const radius = circleSize / 2 - strokeWidth / 2;
	const circumference = 2 * Math.PI * radius;
	const percentToDegree = 360 / 100;

	const offsetFactor = equal ? 0.5 : 0;
	const offsetFactorSecondary = 1 - offsetFactor;

	const { formattedValue: animatedValue, rawValue: animatedRawValue } = useNumberCounter({
		value,
		delay: (transition?.delay ?? 0) / 1000,
		decimalPlaces: value % 1 === 0 ? 0 : 1,
	});

	const getGaugeConfig = () => {
		switch (gaugeType) {
			case "half":
				return {
					startAngle: 180,
					endAngle: 360,
					circumferenceFactor: 0.5,
					viewBox: `0 25 ${circleSize} 50`,
				};
			case "quarter":
				return {
					startAngle: 0,
					endAngle: 90,
					circumferenceFactor: 0.25,
					viewBox: "25 25 50 50",
				};
			default:
				return {
					startAngle: -90,
					endAngle: 270,
					circumferenceFactor: 1,
					viewBox: `0 0 ${circleSize} ${circleSize}`,
				};
		}
	};

	// Use the animated raw value for circle calculations instead of the static value
	const strokePercent = animatedRawValue;

	const gaugeConfig = getGaugeConfig();
	const adjustedCircumference = circumference * gaugeConfig.circumferenceFactor;
	const adjustedPercentToPx = adjustedCircumference / 100;
	const valueY = gaugeType === "half" ? circleSize * 0.43 : circleSize / 2;
	const labelY = gaugeType === "half" ? valueY + 16 : circleSize / 2 + 20;

	const primaryStrokeDasharray = () => {
		if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
			const subtract = -strokePercent + 100;
			return `${Math.max(strokePercent * adjustedPercentToPx - subtract * adjustedPercentToPx, 0)} ${adjustedCircumference}`;
		}
		const subtract = gapPercent * 2 * offsetFactor;
		return `${Math.max(strokePercent * adjustedPercentToPx - subtract * adjustedPercentToPx, 0)} ${adjustedCircumference}`;
	};

	const secondaryStrokeDasharray = () => {
		if (offsetFactorSecondary < 1 && strokePercent < gapPercent * 2 * offsetFactorSecondary) {
			const subtract = strokePercent;
			return `${Math.max((100 - strokePercent) * adjustedPercentToPx - subtract * adjustedPercentToPx, 0)} ${adjustedCircumference}`;
		}
		const subtract = gapPercent * 2 * offsetFactorSecondary;
		return `${Math.max((100 - strokePercent) * adjustedPercentToPx - subtract * adjustedPercentToPx, 0)} ${adjustedCircumference}`;
	};

	const primaryTransform = () => {
		const baseRotation = gaugeType === "half" ? 180 : -90;
		if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
			const add = 0.5 * (-strokePercent + 100);
			return `rotate(${baseRotation + add * percentToDegree}deg)`;
		}
		const add = gapPercent * offsetFactor;
		return `rotate(${baseRotation + add * percentToDegree}deg)`;
	};

	const secondaryTransform = () => {
		const baseRotation = gaugeType === "half" ? 0 : 270;
		if (offsetFactorSecondary < 1 && strokePercent < gapPercent * 2 * offsetFactorSecondary) {
			const subtract = 0.5 * strokePercent;
			return `rotate(${baseRotation - subtract * percentToDegree}deg) scaleY(-1)`;
		}
		const subtract = gapPercent * offsetFactorSecondary;
		return `rotate(${baseRotation - subtract * percentToDegree}deg) scaleY(-1)`;
	};

	const getColor = (colorProp: typeof primary, isSecondary = false) => {
		const defaultColors = isSecondary ? DEFAULT_COLORS_SECONDARY : DEFAULT_COLORS_PRIMARY;

		if (!colorProp) {
			if (isSecondary) {
				return "rgba(85, 85, 85, 0.2)";
			}
			return getDefaultColorByPercent(strokePercent, defaultColors);
		}

		if (typeof colorProp === "string") {
			return defaultColors[colorProp as keyof DefaultColorMap] || colorProp;
		}

		if (typeof colorProp === "object") {
			const checkValue = isSecondary ? 100 - strokePercent : strokePercent;
			const resolved = resolveObjectColor(colorProp, checkValue, defaultColors);
			if (resolved) {
				return resolved;
			}
		}

		return isSecondary ? "#e5e7eb" : "#3b82f6";
	};

	const primaryStroke = getColor(primary);
	const secondaryStroke = getColor(secondary, true);

	const primaryOpacity = () => {
		if (
			offsetFactor > 0 &&
			strokePercent < gapPercent * 2 * offsetFactor &&
			strokePercent < gapPercent * 2 * offsetFactorSecondary
		) {
			return 0;
		}
		return 1;
	};

	const secondaryOpacity = () => {
		if (
			(offsetFactor === 0 && strokePercent > 100 - gapPercent * 2) ||
			(offsetFactor > 0 &&
				strokePercent > 100 - gapPercent * 2 * offsetFactor &&
				strokePercent > 100 - gapPercent * 2 * offsetFactorSecondary)
		) {
			return 0;
		}
		return 1;
	};

	const circleStyles: CSSProperties = {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		strokeDashoffset: 0,
		strokeWidth,
		// Remove CSS transition since we're using animated values
		transformOrigin: "50% 50%",
		shapeRendering: "geometricPrecision",
	};

	const glowStyles = glowEffect
		? {
				filter: `
        drop-shadow(0 0 2px ${primaryStroke}80)
        drop-shadow(0 0 6px ${primaryStroke}60)
        drop-shadow(0 0 12px ${primaryStroke}40)
        drop-shadow(0 0 20px ${primaryStroke}20)
      `,
			}
		: {};

	const generateTickMarks = () => {
		if (!tickMarks) {
			return null;
		}
		const ticks: ReactElement[] = [];
		const tickCount = 8;

		for (let i = 0; i <= tickCount; i++) {
			const angle = (i / tickCount) * (gaugeConfig.endAngle - gaugeConfig.startAngle) + gaugeConfig.startAngle;
			const tickRadius = radius - strokeWidth / 2;
			const tickLength = 6;

			const x1 = circleSize / 2 + (tickRadius - tickLength) * Math.cos((angle * Math.PI) / 180);
			const y1 = circleSize / 2 + (tickRadius - tickLength) * Math.sin((angle * Math.PI) / 180);
			const x2 = circleSize / 2 + tickRadius * Math.cos((angle * Math.PI) / 180);
			const y2 = circleSize / 2 + tickRadius * Math.sin((angle * Math.PI) / 180);

			ticks.push(<line key={i} opacity="0.3" stroke="currentColor" strokeWidth="1" x1={x1} x2={x2} y1={y1} y2={y2} />);
		}
		return ticks;
	};

	return (
		<div className="relative inline-block">
			<svg
				className={cn("", typeof className === "string" ? className : className?.svgClassName)}
				fill="none"
				height={size}
				shapeRendering="crispEdges"
				style={{ userSelect: "none", ...glowStyles }}
				viewBox={`0 0 ${circleSize} ${circleSize}`}
				width={size}
				xmlns="http://www.w3.org/2000/svg"
				{...props}
			>
				<title>Gauge</title>
				{gradient && (
					<defs>
						<linearGradient id="primaryGradient" x1="0%" x2="100%" y1="0%" y2="0%">
							<stop offset="0%" stopColor={primaryStroke} stopOpacity="0.3" />
							<stop offset="100%" stopColor={primaryStroke} stopOpacity="1" />
						</linearGradient>
					</defs>
				)}

				{generateTickMarks()}

				{multiRing?.enabled &&
					multiRing.rings?.map((ring, index) => (
						<circle
							cx={circleSize / 2}
							cy={circleSize / 2}
							key={`ring-${index.toString()}`}
							r={radius - (index + 1) * (strokeWidth + 2)}
							style={{
								...circleStyles,
								strokeWidth: ring.strokeWidth || strokeWidth - 2,
								strokeDasharray: `${(ring.value / 100) * adjustedCircumference} ${adjustedCircumference}`,
								transform: primaryTransform(),
								stroke: ring.color,
								opacity: ring.opacity,
							}}
						/>
					))}

				<circle
					className={cn("", typeof className === "object" && className?.secondaryClassName)}
					cx={circleSize / 2}
					cy={circleSize / 2}
					r={radius}
					style={{
						...circleStyles,
						strokeDasharray: secondaryStrokeDasharray(),
						transform: secondaryTransform(),
						stroke: secondaryStroke,
						opacity: secondaryOpacity(),
					}}
				/>

				<circle
					className={cn("", typeof className === "object" && className?.primaryClassName)}
					cx={circleSize / 2}
					cy={circleSize / 2}
					r={radius}
					style={{
						...circleStyles,
						strokeDasharray: primaryStrokeDasharray(),
						transform: primaryTransform(),
						stroke: gradient ? "url(#primaryGradient)" : primaryStroke,
						opacity: primaryOpacity(),
					}}
				/>
				{thresholds?.map((threshold) => {
					const thresholdPercent = ((threshold.value - min) / (max - min)) * 100;
					const angle =
						(thresholdPercent / 100) * (gaugeConfig.endAngle - gaugeConfig.startAngle) + gaugeConfig.startAngle;
					const indicatorRadius = radius + strokeWidth / 2 + 5;
					const x = circleSize / 2 + indicatorRadius * Math.cos((angle * Math.PI) / 180);
					const y = circleSize / 2 + indicatorRadius * Math.sin((angle * Math.PI) / 180);

					return (
						<circle
							cx={x}
							cy={y}
							fill={threshold.color}
							key={`threshold-${threshold.value}-${threshold.color}`}
							r="2"
						/>
					);
				})}

				{showValue && (
					<g>
						<text
							alignmentBaseline="central"
							className={cn("font-bold", typeof className === "object" && className?.textClassName)}
							dominantBaseline="middle"
							fill="currentColor"
							fontSize={30}
							fontWeight="700"
							style={{ userSelect: "none" }}
							textAnchor="middle"
							x={circleSize / 2}
							y={valueY}
						>
							{animatedValue}
							{showPercentage && unit}
						</text>
					</g>
				)}
				{label && (
					<text
						className="fill-muted-foreground"
						dominantBaseline="middle"
						fontSize={8}
						fontWeight="400"
						style={{ userSelect: "none" }}
						textAnchor="middle"
						x={circleSize / 2}
						y={labelY}
					>
						{label}
					</text>
				)}
			</svg>
		</div>
	);
}

// Hook version for use in SVG contexts - now returns both formatted text and raw animated value
export function useNumberCounter({
	value,
	direction = "up",
	delay = 0,
	decimalPlaces = 0,
}: {
	value: number;
	direction?: "up" | "down";
	delay?: number;
	decimalPlaces?: number;
}) {
	// Initialize at the real value so SSR/prerendered HTML never shows "0";
	// the mount effect below resets to the animation start on the client.
	const [displayValue, setDisplayValue] = useState(value);
	const [rawValue, setRawValue] = useState(value);
	const [isInView, setIsInView] = useState(false);

	const motionValue = useMotionValue(direction === "down" ? value : 0);
	const springValue = useSpring(motionValue, {
		damping: 60,
		stiffness: 100,
	});

	// Set initial display value
	useEffect(() => {
		const initialValue = direction === "down" ? value : 0;
		setDisplayValue(initialValue);
		setRawValue(initialValue);
	}, [direction, value]);

	// Simulate useInView for SVG context
	useEffect(() => {
		const timer = setTimeout(() => setIsInView(true), 100);
		return () => clearTimeout(timer);
	}, []);

	// Trigger animation after delay
	useEffect(() => {
		if (isInView) {
			const timeout = setTimeout(() => {
				motionValue.set(direction === "down" ? 0 : value);
			}, delay * 1000);
			return () => clearTimeout(timeout);
		}
	}, [motionValue, isInView, delay, value, direction]);

	// Update display value when spring value changes
	useEffect(() => {
		const unsubscribe = springValue.on("change", (latest) => {
			const formattedValue = Number(latest.toFixed(decimalPlaces));
			setDisplayValue(formattedValue);
			setRawValue(latest); // Keep the raw animated value for circle animation
		});
		return unsubscribe;
	}, [springValue, decimalPlaces]);

	const formattedDisplayValue = Intl.NumberFormat("en-US", {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces,
	}).format(displayValue);

	return {
		formattedValue: formattedDisplayValue,
		rawValue,
	};
}

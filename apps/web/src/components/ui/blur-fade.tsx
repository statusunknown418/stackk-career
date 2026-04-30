import {
	AnimatePresence,
	type MotionProps,
	motion,
	type UseInViewOptions,
	useInView,
	type Variants,
} from "motion/react";
import { useRef } from "react";

type MarginType = UseInViewOptions["margin"];

interface BlurFadeProps extends MotionProps {
	blur?: string;
	children: React.ReactNode;
	className?: string;
	delay?: number;
	direction?: "up" | "down" | "left" | "right";
	duration?: number;
	inView?: boolean;
	inViewMargin?: MarginType;
	offset?: number;
	variant?: {
		hidden: { y: number };
		visible: { y: number };
	};
}

const getFilter = (v: Variants[string]) => (typeof v === "function" ? undefined : v.filter);

export function BlurFade({
	children,
	className,
	variant,
	duration = 0.4,
	delay = 0,
	offset = 6,
	direction = "down",
	inView = false,
	inViewMargin = "-50px",
	blur = "6px",
	...props
}: BlurFadeProps) {
	const ref = useRef(null);
	const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
	const isInView = !inView || inViewResult;
	const defaultVariants: Variants = {
		hidden: {
			[direction === "left" || direction === "right" ? "x" : "y"]:
				direction === "right" || direction === "down" ? -offset : offset,
			opacity: 0,
			filter: `blur(${blur})`,
		},
		visible: {
			[direction === "left" || direction === "right" ? "x" : "y"]: 0,
			opacity: 1,
			filter: "blur(0px)",
		},
	};
	const combinedVariants = variant ?? defaultVariants;

	const hiddenFilter = getFilter(combinedVariants.hidden);
	const visibleFilter = getFilter(combinedVariants.visible);

	const shouldTransitionFilter = hiddenFilter != null && visibleFilter != null && hiddenFilter !== visibleFilter;

	return (
		<AnimatePresence>
			<motion.div
				animate={isInView ? "visible" : "hidden"}
				className={className}
				exit="hidden"
				initial="hidden"
				ref={ref}
				transition={{
					delay: 0.04 + delay,
					duration,
					ease: "easeOut",
					...(shouldTransitionFilter ? { filter: { duration } } : {}),
				}}
				variants={combinedVariants}
				{...props}
			>
				{children}
			</motion.div>
		</AnimatePresence>
	);
}

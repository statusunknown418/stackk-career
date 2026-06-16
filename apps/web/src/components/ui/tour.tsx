"use client";

import { CaretLeftIcon, CaretRightIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { AnimatePresence, motion, type Variants } from "motion/react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TourContext = React.createContext<{
	start: (tourId: string) => void;
	close: () => void;
} | null>(null);

function useTour() {
	const context = React.useContext(TourContext);
	if (!context) {
		throw new Error("useTour must be used within a TourProvider");
	}
	return context;
}

interface Step {
	align?: React.ComponentProps<typeof PopoverContent>["align"];
	alignOffset?: React.ComponentProps<typeof PopoverContent>["alignOffset"];
	className?: string;
	content: React.ReactNode;
	id: string;
	nextLabel?: React.ReactNode;
	nextRoute?: LinkProps["to"];
	previousLabel?: React.ReactNode;
	previousRoute?: LinkProps["to"];
	side?: React.ComponentProps<typeof PopoverContent>["side"];
	sideOffset?: React.ComponentProps<typeof PopoverContent>["sideOffset"];
	title: React.ReactNode;
}

interface Tour {
	id: string;
	steps: Step[];
}

const stepVariants: Variants = {
	enter: (direction: number) => ({ filter: "blur(4px)", opacity: 0, x: direction * 16 }),
	exit: (direction: number) => ({ filter: "blur(4px)", opacity: 0, x: direction * -16 }),
	visible: { filter: "blur(0px)", opacity: 1, x: 0 },
};

function TourActionButton({
	icon,
	iconPosition = "end",
	label,
	onClick,
	route,
	variant,
}: {
	icon: React.ReactNode;
	iconPosition?: "end" | "start";
	label: React.ReactNode;
	onClick: () => void;
	route?: LinkProps["to"];
	variant?: React.ComponentProps<typeof Button>["variant"];
}) {
	const content =
		iconPosition === "start" ? (
			<>
				{icon}
				{label}
			</>
		) : (
			<>
				{label}
				{icon}
			</>
		);

	if (route) {
		return <Button onClick={onClick} render={<Link to={route}>{content}</Link>} size="sm" variant={variant} />;
	}

	return (
		<Button onClick={onClick} size="sm" variant={variant}>
			{content}
		</Button>
	);
}

function TourProvider({ tours, children }: { tours: Tour[]; children: React.ReactNode }) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [activeTourId, setActiveTourId] = React.useState<string | null>(null);
	const [currentStepIndex, setCurrentStepIndex] = React.useState(0);

	const activeTour = tours.find((tour) => tour.id === activeTourId);
	const steps = activeTour?.steps || [];

	function next() {
		if (currentStepIndex < steps.length - 1) {
			setCurrentStepIndex((prev) => prev + 1);
		} else {
			setIsOpen(false);
			setCurrentStepIndex(0);
			setActiveTourId(null);
		}
	}

	function previous() {
		if (currentStepIndex > 0) {
			setCurrentStepIndex((prev) => prev - 1);
		}
	}

	function close() {
		setIsOpen(false);
		setCurrentStepIndex(0);
		setActiveTourId(null);
	}

	function start(tourId: string) {
		const tour = tours.find((tour) => tour.id === tourId);
		if (tour) {
			if (tour.steps.length > 0) {
				setActiveTourId(tourId);
				setIsOpen(true);
				setCurrentStepIndex(0);
			} else {
				console.error(`Tour with id '${tourId}' has no steps.`);
			}
		} else {
			console.error(`Tour with id '${tourId}' not found.`);
		}
	}

	return (
		<TourContext.Provider
			value={{
				start,
				close,
			}}
		>
			{children}
			{isOpen && activeTour && steps.length > 0 && (
				<TourOverlay
					currentStepIndex={currentStepIndex}
					onClose={close}
					onNext={next}
					onPrevious={previous}
					step={steps[currentStepIndex]}
					totalSteps={steps.length}
				/>
			)}
		</TourContext.Provider>
	);
}

interface TourTarget {
	key: string;
	radius: number;
	rect: DOMRect;
}

function TourOverlay({
	step,
	currentStepIndex,
	totalSteps,
	onNext,
	onPrevious,
	onClose,
}: {
	step: Step;
	currentStepIndex: number;
	totalSteps: number;
	onNext: () => void;
	onPrevious: () => void;
	onClose: () => void;
}) {
	const [targets, setTargets] = React.useState<TourTarget[]>([]);
	const [isMounted, setIsMounted] = React.useState(false);
	const targetKeys = React.useRef(new WeakMap<Element, string>());
	const nextTargetKey = React.useRef(0);

	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	React.useEffect(() => {
		let needsScroll = true;

		function updatePosition() {
			const elements = document.querySelectorAll(`[data-tour-step-id*='${step.id}']`);
			const validElements: (TourTarget & { element: Element })[] = [];

			for (const element of elements) {
				const rect = element.getBoundingClientRect();
				if (rect.width === 0 && rect.height === 0) {
					continue;
				}

				const style = window.getComputedStyle(element);
				const radius = Number.parseFloat(style.borderRadius) || 4;
				let key = targetKeys.current.get(element);

				if (!key) {
					key = `${step.id}-${nextTargetKey.current}`;
					nextTargetKey.current += 1;
					targetKeys.current.set(element, key);
				}

				validElements.push({
					element,
					key,
					radius,
					rect: new DOMRect(rect.left, rect.top, rect.width, rect.height),
				});
			}

			setTargets(validElements.map(({ key, rect, radius }) => ({ key, rect, radius })));

			if (validElements.length > 0 && needsScroll) {
				validElements[0].element.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
				needsScroll = false;
			}
		}

		updatePosition();
		const handleResizeOrScroll = () => updatePosition();

		window.addEventListener("resize", handleResizeOrScroll);
		window.addEventListener("scroll", handleResizeOrScroll, true);

		const observer = new MutationObserver(() => updatePosition());
		observer.observe(document.body, {
			attributes: true,
			childList: true,
			subtree: true,
		});

		const resizeObserver = new ResizeObserver(() => updatePosition());
		resizeObserver.observe(document.body);

		return () => {
			window.removeEventListener("resize", handleResizeOrScroll);
			window.removeEventListener("scroll", handleResizeOrScroll, true);
			observer.disconnect();
			resizeObserver.disconnect();
		};
	}, [step.id]);

	React.useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, []);

	const virtualAnchor = React.useMemo(
		() => ({
			getBoundingClientRect: () => targets[0]?.rect ?? new DOMRect(),
		}),
		[targets]
	);
	const previousStepIndex = React.useRef(currentStepIndex);
	const direction = currentStepIndex >= previousStepIndex.current ? 1 : -1;
	React.useEffect(() => {
		previousStepIndex.current = currentStepIndex;
	}, [currentStepIndex]);

	if (!(isMounted && targets.length > 0)) {
		return null;
	}

	const isLastStep = currentStepIndex === totalSteps - 1;
	const progress = Math.round(((currentStepIndex + 1) / totalSteps) * 100);
	const nextLabel = step.nextLabel ?? (isLastStep ? "Finalizar" : "Siguiente");
	const previousLabel = step.previousLabel ?? "Anterior";

	return createPortal(
		<div className="fixed inset-0 z-50">
			<svg aria-hidden="true" className="absolute inset-0 size-full">
				<title>Tour target highlight</title>
				<defs>
					<mask id="tour-mask">
						<rect fill="white" height="100%" width="100%" x="0" y="0" />
						{targets.map((target) => (
							<rect
								fill="black"
								height={target.rect.height}
								key={target.key}
								rx={target.radius}
								width={target.rect.width}
								x={target.rect.left}
								y={target.rect.top}
							/>
						))}
					</mask>
					<filter height="200%" id="tour-glow" width="200%" x="-50%" y="-50%">
						<feGaussianBlur stdDeviation="3.5" />
					</filter>
				</defs>
				<rect className="fill-black/60" height="100%" mask="url(#tour-mask)" width="100%" />
				{targets.map((target) => (
					<React.Fragment key={target.key}>
						<rect
							className="animate-pulse fill-none stroke-2 stroke-primary opacity-60 motion-reduce:animate-none"
							filter="url(#tour-glow)"
							height={target.rect.height}
							rx={target.radius}
							width={target.rect.width}
							x={target.rect.left}
							y={target.rect.top}
						/>
						<rect
							className="fill-none stroke-2 stroke-primary"
							height={target.rect.height}
							rx={target.radius}
							width={target.rect.width}
							x={target.rect.left}
							y={target.rect.top}
						/>
					</React.Fragment>
				))}
			</svg>
			<Popover open={true}>
				<PopoverContent
					align={step.align}
					alignOffset={step.alignOffset}
					anchor={virtualAnchor}
					className={cn(
						"w-100 max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none before:hidden",
						step.className
					)}
					finalFocus={false}
					initialFocus={false}
					side={step.side}
					sideOffset={step.sideOffset}
				>
					<Card className="relative w-full gap-0 overflow-hidden p-0">
						<div className="h-1 w-full bg-border">
							<motion.div
								animate={{ width: `${progress}%` }}
								className="h-full rounded-r-full bg-primary"
								initial={false}
								transition={{ damping: 30, stiffness: 260, type: "spring" }}
							/>
						</div>

						<Button
							aria-label="Cerrar tutorial"
							className="absolute top-2.5 right-2.5 z-10"
							onClick={onClose}
							size="icon-sm"
							variant="ghost"
						>
							<XIcon />
						</Button>

						<AnimatePresence custom={direction} initial={false} mode="wait">
							<motion.div
								animate="visible"
								className="grid gap-1.5 px-5 pt-5 pr-10"
								custom={direction}
								exit="exit"
								initial="enter"
								key={step.id}
								transition={{ duration: 0.22, ease: "easeOut" }}
								variants={stepVariants}
							>
								<span className="text-muted-foreground text-xs tabular-nums">
									Paso {currentStepIndex + 1} de {totalSteps}
								</span>
								<CardTitle>{step.title}</CardTitle>
								<div className="text-muted-foreground text-sm">{step.content}</div>
							</motion.div>
						</AnimatePresence>

						<div className="flex items-center justify-between gap-2 px-5 pt-4 pb-5">
							{currentStepIndex > 0 ? (
								<TourActionButton
									icon={<CaretLeftIcon />}
									iconPosition="start"
									label={previousLabel}
									onClick={onPrevious}
									route={step.previousRoute}
									variant="ghost"
								/>
							) : (
								<span />
							)}

							<TourActionButton
								icon={isLastStep ? <CheckIcon /> : <CaretRightIcon />}
								label={nextLabel}
								onClick={onNext}
								route={step.nextRoute}
							/>
						</div>
					</Card>
				</PopoverContent>
			</Popover>
		</div>,
		document.body
	);
}

export { type Step, type Tour, TourProvider, useTour };

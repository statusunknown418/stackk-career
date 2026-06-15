"use client";

import { Link, type LinkProps } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

	if (!(isMounted && targets.length > 0)) {
		return null;
	}

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
				</defs>
				<rect className="fill-black opacity-20" height="100%" mask="url(#tour-mask)" width="100%" />
				{targets.map((target) => (
					<rect
						className="fill-none stroke-2 stroke-primary"
						height={target.rect.height}
						key={target.key}
						rx={target.radius}
						width={target.rect.width}
						x={target.rect.left}
						y={target.rect.top}
					/>
				))}
			</svg>
			{targets.length > 0 && (
				<Popover key={step.id} open={true}>
					<PopoverContent
						align={step.align}
						alignOffset={step.alignOffset}
						anchor={virtualAnchor}
						className={cn("px-0", step.className)}
						finalFocus={false}
						initialFocus={false}
						side={step.side}
						sideOffset={step.sideOffset}
					>
						<Card>
							<CardHeader>
								<CardTitle>{step.title}</CardTitle>
								<CardDescription>
									Step {currentStepIndex + 1} of {totalSteps}
								</CardDescription>
								<CardAction>
									<Button aria-label="Close tour" onClick={onClose} size="icon" variant="ghost">
										<XIcon />
									</Button>
								</CardAction>
							</CardHeader>
							<CardContent>{step.content}</CardContent>
							<CardFooter className="justify-between">
								{currentStepIndex > 0 &&
									(step.previousRoute ? (
										<Button
											onClick={onPrevious}
											render={<Link to={step.previousRoute}>{step.previousLabel ?? "Previous"}</Link>}
											variant="outline"
										/>
									) : (
										<Button onClick={onPrevious} variant="outline">
											{step.previousLabel ?? "Previous"}
										</Button>
									))}
								{step.nextRoute ? (
									<Button
										className="ml-auto"
										onClick={onNext}
										render={
											<Link to={step.nextRoute}>
												{step.nextLabel ?? (currentStepIndex === totalSteps - 1 ? "Finish" : "Next")}
											</Link>
										}
									/>
								) : (
									<Button className="ml-auto" onClick={onNext}>
										{step.nextLabel ?? (currentStepIndex === totalSteps - 1 ? "Finish" : "Next")}
									</Button>
								)}
							</CardFooter>
						</Card>
					</PopoverContent>
				</Popover>
			)}
		</div>,
		document.body
	);
}

export { type Step, type Tour, TourProvider, useTour };

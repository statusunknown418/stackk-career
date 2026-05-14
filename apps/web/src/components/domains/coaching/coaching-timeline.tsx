import { Suspense, useState } from "react";
import Loader from "@/components/loader";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Stepper, StepperIndicator, StepperItem, StepperTitle, StepperTrigger } from "@/components/ui/stepper";
import { Booker } from "./booker";

interface StepDef {
	body: string;
	calLink: string;
	step: number;
	title: string;
}

const steps: readonly StepDef[] = [
	{
		step: 1,
		title: "Coaching general",
		body: "Sesiones base con tu mentor. Define objetivos y prioridades.",
		calLink: "impulsa-coaching-fp",
	},
	{
		step: 2,
		title: "Prep pre-entrevista",
		body: "Estrategia, materiales y revisión de CV.",
		calLink: "impulsa-coaching-pi",
	},
	{
		step: 3,
		title: "Mock interview",
		body: "Simulacro en vivo con feedback inmediato.",
		calLink: "impulsa-coaching-mock",
	},
	{
		step: 4,
		title: "Follow up",
		body: "Retro, ajustes y próximos pasos.",
		calLink: "impulsa-coaching-follow",
	},
];

export function CoachingTimeline() {
	const [active, setActive] = useState(2);
	const current = steps.find((s) => s.step === active);

	return (
		<div className="w-full space-y-8">
			<Stepper className="items-start gap-4" onValueChange={setActive} value={active}>
				{steps.map(({ step, title }) => (
					<StepperItem className="flex-1" key={step} step={step}>
						<StepperTrigger className="w-full flex-col items-start gap-2 rounded">
							<StepperIndicator asChild className="h-1 w-full bg-border">
								<span className="sr-only">{step}</span>
							</StepperIndicator>
							<div className="flex items-center gap-2">
								<span className="flex size-5 shrink-0 items-center justify-center rounded-full border bg-muted font-medium text-[10px] text-muted-foreground group-data-[state=active]/step:border-transparent group-data-[state=completed]/step:border-transparent group-data-[state=active]/step:bg-primary group-data-[state=completed]/step:bg-primary group-data-[state=active]/step:text-primary-foreground group-data-[state=completed]/step:text-primary-foreground">
									{step}
								</span>
								<StepperTitle>{title}</StepperTitle>
							</div>
						</StepperTrigger>
					</StepperItem>
				))}
			</Stepper>

			<Frame>
				<FrameHeader>
					<FrameDescription>{current?.body}</FrameDescription>
				</FrameHeader>

				<FramePanel>
					<Suspense fallback={<Loader />}>
						{current?.calLink && <Booker eventSlug={current?.calLink} key={current.calLink} />}
					</Suspense>
				</FramePanel>
			</Frame>
		</div>
	);
}

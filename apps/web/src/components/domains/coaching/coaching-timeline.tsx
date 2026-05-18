import type { coachingBookingChangedTask } from "@stackk-career/jobs/trigger/tasks/coaching-booking-changed";
import type { CoachingBookingSummary, CoachingStage } from "@stackk-career/schemas/api/coaching";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Suspense, useEffect, useRef } from "react";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Stepper, StepperIndicator, StepperItem, StepperTitle, StepperTrigger } from "@/components/ui/stepper";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { Booker } from "./booker";
import { ScheduledEventCard } from "./scheduled-event-card";

interface StepDef {
	body: string;
	calLink: string;
	stage: CoachingStage;
	step: number;
	title: string;
}

const routeApi = getRouteApi("/_protected/dash/coaches");

const DEFAULT_STEP = 1;
const coachingDashboardQueryKey = orpc.coaching.dashboard.queryOptions().queryKey;

const steps: readonly StepDef[] = [
	{
		step: 1,
		title: "Coaching general",
		body: "Sesiones base con tu mentor. Define objetivos y prioridades.",
		calLink: "impulsa-coaching-fp",
		stage: "general-coaching",
	},
	{
		step: 2,
		title: "Prep pre-entrevista",
		body: "Estrategia, materiales y revisión de CV.",
		calLink: "impulsa-coaching-pi",
		stage: "pre-interview-training",
	},
	{
		step: 3,
		title: "Mock interview",
		body: "Simulacro en vivo con feedback inmediato.",
		calLink: "impulsa-coaching-mock",
		stage: "mock-interview",
	},
	{
		step: 4,
		title: "Follow up",
		body: "Retro, ajustes y próximos pasos.",
		calLink: "impulsa-coaching-follow",
		stage: "follow-up",
	},
];

function pickStageBooking(
	bookings: readonly CoachingBookingSummary[] | undefined,
	stage: CoachingStage
): CoachingBookingSummary | null {
	if (!bookings) {
		return null;
	}
	const nowMs = Date.now();
	const candidates = bookings.filter(
		(b) => b.stage === stage && b.bookingStatus !== "cancelled" && b.startsAt && b.startsAt.getTime() >= nowMs
	);
	candidates.sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0));
	return candidates[0] ?? null;
}

export function CoachingTimeline() {
	const search = routeApi.useSearch();
	const navigate = routeApi.useNavigate();
	const active = search.step ?? DEFAULT_STEP;
	const setActive = (next: number) => {
		navigate({
			search: (prev) => ({ ...prev, step: next === DEFAULT_STEP ? undefined : next }),
			replace: true,
		});
	};
	const current = steps.find((s) => s.step === active);

	const { data: session } = authClient.useSession();
	const userId = session?.user?.id;
	const queryClient = useQueryClient();

	const { data: dashboard } = useQuery(
		orpc.coaching.dashboard.queryOptions({
			enabled: !!userId,
		})
	);

	const { data: realtime } = useQuery({
		...orpc.coaching.realtimeToken.queryOptions(),
		enabled: Boolean(userId),
		refetchInterval: 25 * 60 * 1000,
		staleTime: 25 * 60 * 1000,
	});

	const tag = userId ? `user:${userId}` : "user:pending";
	const { runs } = useRealtimeRunsWithTag<typeof coachingBookingChangedTask>(tag, {
		accessToken: realtime?.token,
		enabled: Boolean(userId && realtime?.token),
	});

	const lastRunCountRef = useRef(0);

	useEffect(() => {
		if (runs.length > lastRunCountRef.current) {
			queryClient.invalidateQueries({ queryKey: coachingDashboardQueryKey });
		}
		lastRunCountRef.current = runs.length;
	}, [runs.length, queryClient]);

	const stageBooking = current ? pickStageBooking(dashboard?.bookings, current.stage) : null;

	const firstStep = steps[0]?.step ?? DEFAULT_STEP;
	const lastStep = steps.at(-1)?.step ?? DEFAULT_STEP;
	const canGoPrev = active > firstStep;
	const canGoNext = active < lastStep;

	const goPrev = () => {
		if (canGoPrev) {
			setActive(active - 1);
		}
	};
	const goNext = () => {
		if (canGoNext) {
			setActive(active + 1);
		}
	};

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

			{stageBooking && current ? (
				<ScheduledEventCard booking={stageBooking} stepName={current.title} />
			) : (
				<Frame>
					<FrameHeader>
						<FrameDescription>{current?.body}</FrameDescription>
					</FrameHeader>

					<FramePanel className="h-135 overflow-y-scroll">
						<Suspense fallback={<Loader />}>
							{current?.calLink && userId && session?.user && (
								<Booker
									email={session.user.email}
									eventSlug={current.calLink}
									key={current.calLink}
									name={session.user.name ?? ""}
									userId={userId}
								/>
							)}
						</Suspense>
					</FramePanel>
				</Frame>
			)}

			<section className="flex items-center justify-between">
				<Button disabled={!canGoPrev} onClick={goPrev} size="sm" type="button" variant="outline">
					<ChevronLeftIcon aria-hidden="true" />
					Anterior
				</Button>
				<span className="text-muted-foreground text-xs">
					Paso {active} de {lastStep}
				</span>
				<Button disabled={!canGoNext} onClick={goNext} size="sm" type="button" variant="outline">
					Siguiente
					<ChevronRightIcon aria-hidden="true" />
				</Button>
			</section>
		</div>
	);
}

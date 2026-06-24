import { InfoIcon, SparkleIcon } from "@phosphor-icons/react";
import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeRun, useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { invalidateBillingQueries } from "@/lib/billing-cache";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import { mapParserPhase, mergeResumeParserEvents, readResumeParserRecentTrace } from "./lib/map-parser-phase";
import { ResumeParserTimeline } from "./resume-parser-timeline";
import { ResumeParserTrace } from "./resume-parser-trace";

interface ResumePendingCardsProps {
	accessToken: string;
	userId: string;
	variant?: "grid" | "stack";
}

const ACTIVE_STATUSES: Record<string, true> = {
	DELAYED: true,
	EXECUTING: true,
	QUEUED: true,
	REATTEMPTING: true,
	WAITING_FOR_DEPLOY: true,
};

export interface ResumePendingCardModel {
	events: ResumeParserEvent[];
	id: string;
	progress: number;
	title: string;
}

export function ResumePendingCards({
	accessToken,
	userId,
	variant = "grid",
}: ResumePendingCardsProps): React.ReactElement | null {
	const queryClient = useQueryClient();
	const { runs } = useRealtimeRunsWithTag<typeof resumeParserTask>(`user:${userId}`, { accessToken });

	const completedCountRef = useRef(0);
	const completedCount = runs.filter((r) => r.status === "COMPLETED").length;

	useEffect(() => {
		if (completedCount > completedCountRef.current) {
			Promise.all([
				queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() }),
				invalidateBillingQueries(queryClient),
			]);
		}
		completedCountRef.current = completedCount;
	}, [completedCount, queryClient]);

	const pending: ResumePendingCardModel[] = runs
		.filter((r) => r.tags.includes("agent:resume-parser"))
		.filter((r) => ACTIVE_STATUSES[r.status])
		.map((r) => {
			const metadata = r.metadata as Record<string, unknown> | null | undefined;
			const phase = mapParserPhase(metadata);
			return {
				events: readResumeParserRecentTrace(metadata),
				id: r.id,
				progress: Math.round(phase.progress * 100),
				title: phase.displayName ?? "CV importado",
			};
		});

	if (pending.length === 0) {
		return null;
	}

	return (
		<ul
			aria-label="CVs en proceso"
			className={cn(
				"list-none",
				variant === "grid" && "grid gap-4 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3",
				variant === "stack" && "flex flex-col gap-3"
			)}
		>
			{pending.map((card) => (
				<li key={card.id}>
					<ResumePendingCard
						card={card}
						detail={<ResumePendingTracePopover accessToken={accessToken} runId={card.id} />}
						variant={variant}
					/>
				</li>
			))}
		</ul>
	);
}

export function ResumePendingCard({
	card,
	detail,
	variant,
}: {
	card: ResumePendingCardModel;
	detail: React.ReactNode;
	variant: "grid" | "stack";
}): React.ReactElement {
	const isStack = variant === "stack";

	return (
		<Frame aria-busy="true">
			<FrameHeader className={cn(isStack && "px-3 py-3")}>
				<div className="flex items-center gap-2">
					<Badge size="sm" variant="info">
						<SparkleIcon weight="fill" />
						Procesando
					</Badge>
					<FrameTitle className={cn("truncate", isStack && "text-sm")}>{card.title}</FrameTitle>
				</div>
			</FrameHeader>

			<FramePanel className={cn("space-y-4", isStack && "px-3 py-4")}>
				<div className="flex items-center gap-3">
					<Progress className="flex-1" max={100} value={card.progress}>
						<ProgressTrack>
							<ProgressIndicator />
						</ProgressTrack>
					</Progress>
					<span className="shrink-0 text-muted-foreground text-xs tabular-nums">{card.progress}%</span>
				</div>

				<ResumeParserTimeline density="compact" events={card.events} />
			</FramePanel>

			<FrameFooter className="px-2 pt-1 pb-2">
				<Popover>
					<PopoverTrigger
						render={
							<Button
								aria-label="Ver detalle del parser"
								className="w-full justify-center"
								size="sm"
								variant="ghost-muted"
							>
								<InfoIcon />
								Ver detalle
							</Button>
						}
					/>
					<PopoverPopup align="end" className="w-90">
						{detail}
					</PopoverPopup>
				</Popover>
			</FrameFooter>
		</Frame>
	);
}

function ResumePendingTracePopover({ accessToken, runId }: { accessToken: string; runId: string }): React.ReactElement {
	const { run } = useRealtimeRun<typeof resumeParserTask>(runId, { accessToken });
	const events = mergeResumeParserEvents(run?.metadata as Record<string, unknown> | null | undefined);
	const phase = mapParserPhase(run?.metadata as Record<string, unknown> | null | undefined, events);

	return (
		<section className="space-y-3">
			<header className="space-y-1">
				<h4 className="font-medium text-sm">{phase.displayName ?? "Importando CV"}</h4>
				<p className="text-muted-foreground text-xs">{phase.currentLabel ?? phase.label}</p>
			</header>
			<ResumeParserTrace className="bg-background" events={events} />
		</section>
	);
}

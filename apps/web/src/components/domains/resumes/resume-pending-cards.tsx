import { InfoIcon, SparkleIcon } from "@phosphor-icons/react";
import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeRun, useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { CheckCircleIcon, ClockIcon, SearchIcon, WrenchIcon, XCircleIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import {
	formatResumeParserTraceLine,
	mapParserPhase,
	mergeResumeParserEvents,
	readResumeParserRecentTrace,
} from "./lib/map-parser-phase";
import { ResumeParserTrace } from "./resume-parser-trace";

interface ResumePendingCardsProps {
	accessToken: string;
	userId: string;
	variant?: "grid" | "stack";
}

const ACTIVE_STATUSES = new Set<string>(["QUEUED", "EXECUTING", "DELAYED", "REATTEMPTING", "WAITING_FOR_DEPLOY"]);

const getTraceIcon = (event: ResumeParserEvent) => {
	if (event.toolName) {
		if (event.status === "failed" || event.status === "canceled") {
			return XCircleIcon;
		}
		if (event.status === "complete") {
			return CheckCircleIcon;
		}
		return ClockIcon;
	}

	if (event.mock) {
		return SearchIcon;
	}

	return WrenchIcon;
};

const getTraceIconClassName = (event: ResumeParserEvent) => {
	if (event.status === "failed" || event.status === "canceled") {
		return "size-3.5 text-destructive";
	}
	if (event.status === "running") {
		return "size-3.5 animate-pulse text-info-foreground";
	}
	return "size-3.5 text-muted-foreground";
};

const getTraceBadgeVariant = (event: ResumeParserEvent): "error" | "secondary" | "success" => {
	if (event.status === "failed" || event.status === "canceled") {
		return "error";
	}
	if (event.status === "complete") {
		return "success";
	}
	return "secondary";
};

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
			queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() });
		}
		completedCountRef.current = completedCount;
	}, [completedCount, queryClient]);

	const pending = runs
		.filter((r) => r.tags.includes("agent:resume-parser"))
		.filter((r) => ACTIVE_STATUSES.has(r.status))
		.map((r) => {
			const metadata = r.metadata as Record<string, unknown> | null | undefined;
			const phase = mapParserPhase(metadata);
			return {
				id: r.id,
				label: phase.displayName ?? "CV importado",
				phaseLabel: phase.label,
				recentTrace: readResumeParserRecentTrace(metadata),
				progress: Math.round(phase.progress * 100),
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
			{pending.map((card) => {
				const isStack = variant === "stack";
				const traceRows = isStack ? card.recentTrace.slice(-2) : card.recentTrace;

				return (
					<li key={card.id}>
						<Frame aria-busy="true">
							<FrameHeader className={cn(isStack && "px-3 py-3")}>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<Badge size="sm" variant="info">
											<SparkleIcon weight="fill" />
											Procesando
										</Badge>
										<FrameTitle className={cn(isStack && "text-sm")}>{card.label}</FrameTitle>
									</div>

									{isStack && <span className="text-muted-foreground text-xs tabular-nums">{card.progress}%</span>}
								</div>
							</FrameHeader>

							<FramePanel className={cn(isStack && "px-3 py-3")}>
								<div className={cn(isStack ? "space-y-2" : "space-y-3")}>
									<Progress max={100} value={card.progress}>
										<ProgressTrack>
											<ProgressIndicator />
										</ProgressTrack>
									</Progress>

									<div className="space-y-1.5">
										{traceRows.length > 0 ? (
											traceRows.map((event) => (
												<ResumePendingTraceRow
													event={event}
													key={`${card.id}-${event.at ?? "na"}-${event.kind}-${event.status}`}
												/>
											))
										) : (
											<p className="text-muted-foreground text-xs">Esperando primeras trazas del parser…</p>
										)}
									</div>
								</div>
							</FramePanel>

							<FrameFooter
								className={cn(
									"flex items-center justify-between gap-2 text-muted-foreground text-xs",
									isStack && "px-3 py-2.5"
								)}
							>
								<span className="truncate">{card.phaseLabel}</span>
								<div className="flex items-center gap-1">
									<Popover>
										<PopoverTrigger>
											<Button aria-label="Ver detalle del parser" size="icon-xs" variant="ghost-muted">
												<InfoIcon />
											</Button>
										</PopoverTrigger>
										<PopoverPopup align="end" className="w-120">
											<ResumePendingTracePopover accessToken={accessToken} runId={card.id} />
										</PopoverPopup>
									</Popover>
									{!isStack && <span className="tabular-nums">{card.progress}%</span>}
								</div>
							</FrameFooter>
						</Frame>
					</li>
				);
			})}
		</ul>
	);
}

function ResumePendingTraceRow({ event }: { event: ResumeParserEvent }): React.ReactElement {
	const label = formatResumeParserTraceLine(event);
	const isRunning = event.status === "running";
	const isFailed = event.status === "failed" || event.status === "canceled";
	const Icon = getTraceIcon(event);

	return (
		<div
			className={
				"flex items-center gap-2 rounded-md border border-transparent bg-muted/30 px-2 py-1.5 text-xs transition-colors"
			}
		>
			<div className="flex shrink-0 items-center gap-1.5">
				{event.mock ? (
					<SparkleIcon
						className={isRunning ? "text-info-foreground" : "text-muted-foreground"}
						size={12}
						weight="fill"
					/>
				) : (
					<Icon className={getTraceIconClassName(event)} />
				)}
			</div>

			<div className="min-w-0 flex-1">
				{isRunning ? (
					<Shimmer as="span" className="block truncate text-xs">
						{label}
					</Shimmer>
				) : (
					<p className={isFailed ? "truncate text-destructive" : "truncate text-muted-foreground"}>{label}</p>
				)}
			</div>

			{event.toolName && (
				<Badge size="sm" variant={getTraceBadgeVariant(event)}>
					{event.mock ? "IA" : "Tool"}
				</Badge>
			)}
		</div>
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

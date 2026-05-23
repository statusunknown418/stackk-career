import { SparkleIcon } from "@phosphor-icons/react";
import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Frame, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { orpc } from "@/utils/orpc";
import { mapParserPhase } from "./lib/map-parser-phase";

interface ResumePendingCardsProps {
	accessToken: string;
	userId: string;
}

const ACTIVE_STATUSES = new Set<string>(["QUEUED", "EXECUTING", "DELAYED", "REATTEMPTING", "WAITING_FOR_DEPLOY"]);

export function ResumePendingCards({ accessToken, userId }: ResumePendingCardsProps): React.ReactElement | null {
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
			const phase = mapParserPhase(r.metadata as Record<string, unknown> | null | undefined);
			return {
				id: r.id,
				label: phase.displayName ?? "CV importado",
				phaseLabel: phase.label,
				progress: Math.round(phase.progress * 100),
			};
		});

	if (pending.length === 0) {
		return null;
	}

	return (
		<ul aria-label="CVs en proceso" className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			{pending.map((card) => (
				<li key={card.id}>
					<Frame aria-busy="true">
						<FrameHeader>
							<ul aria-label="Estado del CV" className="flex list-none items-center gap-2">
								<Badge size="sm" variant="info">
									<SparkleIcon weight="fill" />
									Procesando
								</Badge>
							</ul>
							<FrameTitle>{card.label}</FrameTitle>
						</FrameHeader>

						<FramePanel>
							<Progress max={100} value={card.progress}>
								<ProgressTrack>
									<ProgressIndicator />
								</ProgressTrack>
							</Progress>
						</FramePanel>

						<FrameFooter className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
							<span>{card.phaseLabel}</span>
							<span className="tabular-nums">{card.progress}%</span>
						</FrameFooter>
					</Frame>
				</li>
			))}
		</ul>
	);
}

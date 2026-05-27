import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";

const ACTIVE_STATUSES = new Set<string>(["QUEUED", "EXECUTING", "DELAYED", "REATTEMPTING", "WAITING_FOR_DEPLOY"]);
const FAILURE_STATUSES = new Set<string>(["FAILED", "CANCELED", "CRASHED", "SYSTEM_FAILURE", "TIMED_OUT", "EXPIRED"]);

export interface ResumeDraftContext {
	accessToken: string;
	fileId: string;
	userId: string;
}

export function useResumeDraftRuns({ accessToken, fileId, userId }: ResumeDraftContext) {
	const { runs } = useRealtimeRunsWithTag<typeof resumeParserTask>(`user:${userId}`, { accessToken });

	const relatedRuns = runs
		.filter((run) => run.tags.includes("agent:resume-parser") && run.tags.includes(`file:${fileId}`))
		.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

	return {
		activeRun: relatedRuns.find((run) => ACTIVE_STATUSES.has(run.status)),
		completedRun: relatedRuns.find((run) => run.status === "COMPLETED" && Boolean(run.output?.resumeId)),
		failedRun: relatedRuns.find((run) => FAILURE_STATUSES.has(run.status)),
	};
}

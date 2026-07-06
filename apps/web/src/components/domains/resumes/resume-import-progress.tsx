import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { mapParserPhase, mergeResumeParserEvents } from "./lib/map-parser-phase";
import { ResumeParserTrace } from "./resume-parser-trace";

interface ResumeImportProgressProps {
	accessToken: string;
	onComplete: (resumeId: string) => void;
	onRetry: () => void;
	onTerminal: () => void;
	parserRunId: string;
}

const FAILURE_STATUSES: Record<string, true> = {
	CRASHED: true,
	EXPIRED: true,
	FAILED: true,
	SYSTEM_FAILURE: true,
	TIMED_OUT: true,
};

export function ResumeImportProgress({
	accessToken,
	onComplete,
	onRetry,
	onTerminal,
	parserRunId,
}: ResumeImportProgressProps): React.ReactElement {
	const { run } = useRealtimeRun<typeof resumeParserTask>(parserRunId, { accessToken });
	const traceEvents = mergeResumeParserEvents(run?.metadata as Record<string, unknown> | null | undefined);
	const phase = mapParserPhase(run?.metadata as Record<string, unknown> | null | undefined, traceEvents);
	const status = run?.status;

	useEffect(() => {
		if (status === "COMPLETED" && run?.output?.resumeId) {
			onComplete(run.output.resumeId);
		}
	}, [status, run?.output?.resumeId, onComplete]);

	const progressPct = Math.round(phase.progress * 100);

	if (status === "CANCELED") {
		return (
			<section className="flex flex-col gap-4">
				<header className="flex flex-col gap-1">
					<h3 className="font-medium text-lg">No pudimos detectar un CV en este PDF</h3>
					{phase.validationReason && <p className="text-muted-foreground text-sm">{phase.validationReason}</p>}
				</header>
				<ResumeParserTrace autoScroll className="bg-background" events={traceEvents} />
				<Button onClick={onTerminal} type="button">
					Subir otro archivo
				</Button>
			</section>
		);
	}

	if (status && FAILURE_STATUSES[status]) {
		return (
			<section className="flex flex-col gap-4">
				<header className="flex flex-col gap-1">
					<h3 className="font-medium text-lg">Algo falló al procesar</h3>
					<p className="text-muted-foreground text-sm">Intenta nuevamente.</p>
				</header>
				<ResumeParserTrace autoScroll className="bg-background" events={traceEvents} />
				<Button onClick={onRetry} type="button">
					Reintentar
				</Button>
			</section>
		);
	}

	return (
		<section className="flex flex-col gap-4">
			<p className="text-muted-foreground text-sm">{phase.currentLabel ?? phase.label}</p>

			<Progress max={100} value={progressPct}>
				<ProgressTrack>
					<ProgressIndicator />
				</ProgressTrack>
			</Progress>

			<div className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
				<span>{phase.label}</span>
				<span className="tabular-nums">{progressPct}%</span>
			</div>

			<ResumeParserTrace autoScroll events={traceEvents} />
		</section>
	);
}

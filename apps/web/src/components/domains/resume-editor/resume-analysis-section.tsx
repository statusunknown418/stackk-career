import { SparkleIcon } from "@phosphor-icons/react";
import type { k02DetailedAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-detailed-analysis";
import type { ResumeAnalysis, ResumeEdit } from "@stackk-career/schemas/ai/resume-analysis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useState } from "react";
import { toast } from "sonner";
import { ResumeEditorAnalysisPanel } from "@/components/domains/resume-editor/resume-analysis-panel";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

interface ResumeStreams {
	"resume-analysis": DeepPartial<ResumeAnalysis>;
}

export function ResumeAnalysisSection({
	resumeId,
	onApplyEdit,
	onViewSection,
}: {
	resumeId: string;
	onApplyEdit?: (edit: ResumeEdit) => boolean;
	onViewSection?: (edit: ResumeEdit) => void;
}) {
	const [appliedSlots, setAppliedSlots] = useState<Set<number>>(() => new Set());
	const queryClient = useQueryClient();
	const [runHandle, setRunHandle] = useState<{ runId: string; accessToken: string } | null>(null);

	const cachedAnalysisOptions = orpc.resumes.getResumeAnalysis.queryOptions({
		input: { resumeId },
		staleTime: Number.POSITIVE_INFINITY,
	});
	const cachedAnalysis = useQuery(cachedAnalysisOptions);

	const initiateAnalysis = useMutation(
		orpc.agents.triggerK02DetailedAnalysis.mutationOptions({
			onSuccess: ({ runId, publicAccessToken }) => {
				setRunHandle({ runId, accessToken: publicAccessToken });
			},
			onError: (mutationError) => {
				toast.error(mutationError.message || "No se pudo iniciar el análisis.");
			},
		})
	);

	const {
		run,
		streams,
		error: realtimeError,
	} = useRealtimeRunWithStreams<typeof k02DetailedAnalysisTask, ResumeStreams>(runHandle?.runId, {
		accessToken: runHandle?.accessToken,
		enabled: Boolean(runHandle),
		onComplete: () => {
			queryClient.invalidateQueries({ queryKey: cachedAnalysisOptions.queryKey });
		},
	});

	const streamedAnalysis = streams["resume-analysis"]?.at(-1);
	const cachedData = cachedAnalysis.data?.analysis;
	const analysisData: DeepPartial<ResumeAnalysis> | undefined = streamedAnalysis ?? cachedData;

	const runStatus = run?.status;
	const isFailed =
		runStatus === "FAILED" ||
		runStatus === "CANCELED" ||
		runStatus === "CRASHED" ||
		runStatus === "SYSTEM_FAILURE" ||
		runStatus === "TIMED_OUT" ||
		runStatus === "EXPIRED";
	const isTerminal = runStatus === "COMPLETED" || isFailed;
	const isRunActive = Boolean(runHandle) && !isTerminal;
	const isStreaming = initiateAnalysis.isPending || isRunActive;
	const error =
		realtimeError ??
		(isFailed ? new Error("Algo ocurrió con el análisis, por favor intenta nuevamente en unos minutos") : undefined);

	const handleAnalyze = () => {
		setRunHandle(null);
		setAppliedSlots(new Set());
		queryClient.setQueryData(cachedAnalysisOptions.queryKey, null);
		initiateAnalysis.mutate({ resumeId });
	};

	const handleApply = (edit: ResumeEdit, slot: number) => {
		if (!onApplyEdit) {
			return;
		}
		const ok = onApplyEdit(edit);
		if (ok) {
			setAppliedSlots((prev) => {
				const next = new Set(prev);
				next.add(slot);
				return next;
			});
		}
	};

	if (cachedAnalysis.isLoading) {
		return null;
	}

	const hasAnything = Boolean(analysisData) || isStreaming || error;

	if (!hasAnything) {
		return (
			<section className="flex flex-col gap-3 rounded-lg bg-background p-3">
				<hgroup className="space-y-0.5">
					<h3 className="font-medium text-sm">Análisis de tu CV</h3>
					<p className="text-muted-foreground text-xs">Puntajes y sugerencias sobre tu CV actual.</p>
				</hgroup>
				<Button className="w-full" disabled={initiateAnalysis.isPending} onClick={handleAnalyze}>
					<SparkleIcon />
					Analizar
				</Button>
			</section>
		);
	}

	return (
		<ResumeEditorAnalysisPanel
			analysis={analysisData}
			appliedSlots={appliedSlots}
			error={error}
			isStreaming={isStreaming}
			onApplyEdit={onApplyEdit ? handleApply : undefined}
			onRetry={handleAnalyze}
			onViewSection={onViewSection}
		/>
	);
}

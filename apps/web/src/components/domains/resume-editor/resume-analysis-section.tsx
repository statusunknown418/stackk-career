import { GpsSlashIcon, SparkleIcon } from "@phosphor-icons/react";
import type { k02DetailedAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-detailed-analysis";
import type { ResumeAnalysis, ResumeEdit } from "@stackk-career/schemas/ai/resume-analysis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResumeEditorAnalysisPanel } from "@/components/domains/resume-editor/resume-analysis-panel";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

interface ResumeStreams {
	"resume-analysis": DeepPartial<ResumeAnalysis>;
}

type CachedAnalysis = {
	id: string;
	analysis: ResumeAnalysis;
	appliedEditIndices: number[];
	dismissedEditIndices: number[];
} | null;

export function ResumeAnalysisSection({
	resumeId,
	hasJobExperience,
	onApplyEdit,
	onViewSection,
}: {
	resumeId: string;
	hasJobExperience: boolean;
	onApplyEdit?: (edit: ResumeEdit) => boolean;
	onViewSection?: (edit: ResumeEdit) => void;
}) {
	const queryClient = useQueryClient();
	const [runHandle, setRunHandle] = useState<{ runId: string; accessToken: string; analysisId: string } | null>(null);

	const cachedAnalysisOptions = orpc.resumes.getResumeAnalysis.queryOptions({
		input: { resumeId },
		staleTime: Number.POSITIVE_INFINITY,
	});
	const cachedAnalysis = useQuery(cachedAnalysisOptions);

	const initiateAnalysis = useMutation(
		orpc.agents.triggerK02DetailedAnalysis.mutationOptions({
			onSuccess: ({ runId, analysisId, publicAccessToken }) => {
				setRunHandle({ runId, accessToken: publicAccessToken, analysisId });
			},
			onError: (mutationError) => {
				toast.error(mutationError.message || "No se pudo iniciar el análisis.");
			},
		})
	);

	const setEditApplied = useMutation(
		orpc.resumeAnalyses.setEditApplied.mutationOptions({
			onMutate: async ({ editIndex, applied }) => {
				await queryClient.cancelQueries({ queryKey: cachedAnalysisOptions.queryKey });
				const previous = queryClient.getQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey);
				queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, (prev) => {
					if (!prev) {
						return prev;
					}
					const nextSet = new Set(prev.appliedEditIndices);
					if (applied) {
						nextSet.add(editIndex);
					} else {
						nextSet.delete(editIndex);
					}
					return { ...prev, appliedEditIndices: [...nextSet].sort((a, b) => a - b) };
				});
				return { previous };
			},
			onError: (mutationError, _vars, ctx) => {
				if (ctx?.previous !== undefined) {
					queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, ctx.previous);
				}
				toast.error(mutationError.message || "No se pudo guardar el estado.");
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: cachedAnalysisOptions.queryKey });
			},
		})
	);

	const setEditDismissed = useMutation(
		orpc.resumeAnalyses.setEditDismissed.mutationOptions({
			onMutate: async ({ editIndex, dismissed }) => {
				await queryClient.cancelQueries({ queryKey: cachedAnalysisOptions.queryKey });
				const previous = queryClient.getQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey);
				queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, (prev) => {
					if (!prev) {
						return prev;
					}
					const nextSet = new Set(prev.dismissedEditIndices);
					if (dismissed) {
						nextSet.add(editIndex);
					} else {
						nextSet.delete(editIndex);
					}
					return { ...prev, dismissedEditIndices: [...nextSet].sort((a, b) => a - b) };
				});
				return { previous };
			},
			onError: (mutationError, _vars, ctx) => {
				if (ctx?.previous !== undefined) {
					queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, ctx.previous);
				}
				toast.error(mutationError.message || "No se pudo guardar el estado.");
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: cachedAnalysisOptions.queryKey });
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

	const activeAnalysisId = runHandle?.analysisId ?? cachedAnalysis.data?.id;

	const appliedSlots = useMemo(
		() => new Set(cachedAnalysis.data?.appliedEditIndices ?? []),
		[cachedAnalysis.data?.appliedEditIndices]
	);

	const dismissedSlots = useMemo(
		() => new Set(cachedAnalysis.data?.dismissedEditIndices ?? []),
		[cachedAnalysis.data?.dismissedEditIndices]
	);

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

	const analysisData: DeepPartial<ResumeAnalysis> | undefined = isStreaming
		? streamedAnalysis
		: (streamedAnalysis ?? cachedData);

	const handleAnalyze = () => {
		const parentAnalysisId = cachedAnalysis.data?.id;
		setRunHandle(null);
		queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, null);
		initiateAnalysis.mutate({ resumeId, parentAnalysisId });
	};

	const handleApply = (edit: ResumeEdit, slot: number) => {
		if (!onApplyEdit) {
			return;
		}
		const ok = onApplyEdit(edit);
		if (!(ok && activeAnalysisId)) {
			return;
		}
		setEditApplied.mutate({ analysisId: activeAnalysisId, editIndex: slot, applied: true });
	};

	const handleDismiss = (slot: number, dismissed: boolean) => {
		if (!activeAnalysisId) {
			return;
		}
		setEditDismissed.mutate({ analysisId: activeAnalysisId, editIndex: slot, dismissed });
	};

	if (cachedAnalysis.isLoading) {
		return null;
	}

	const hasAnything = Boolean(analysisData) || isStreaming || error;

	if (!hasAnything) {
		return (
			<section className="flex flex-col gap-3 rounded-lg bg-card p-3">
				<hgroup className="space-y-0.5">
					<h3 className="font-medium text-sm">Análisis de tu CV</h3>
					<p className="text-muted-foreground text-xs">Puntajes y sugerencias sobre tu CV actual.</p>
				</hgroup>
				{hasJobExperience ? (
					<Button className="w-full" disabled={initiateAnalysis.isPending} onClick={handleAnalyze}>
						<SparkleIcon />
						Analizar
					</Button>
				) : (
					<div className="flex items-start gap-2 rounded-md bg-muted p-3 text-muted-foreground text-sm">
						<GpsSlashIcon className="mt-0.5 size-4 shrink-0" />
						<p>Agrega al menos una experiencia laboral para que Casey pueda analizar tu CV.</p>
					</div>
				)}
			</section>
		);
	}

	return (
		<ResumeEditorAnalysisPanel
			analysis={analysisData}
			appliedSlots={appliedSlots}
			dismissedSlots={dismissedSlots}
			error={error}
			isStreaming={isStreaming}
			onApplyEdit={onApplyEdit ? handleApply : undefined}
			onDismissEdit={activeAnalysisId ? handleDismiss : undefined}
			onRetry={handleAnalyze}
			onViewSection={onViewSection}
		/>
	);
}

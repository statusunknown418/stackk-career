import { GpsSlashIcon, SparkleIcon } from "@phosphor-icons/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import type { k02DetailedAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-detailed-analysis";
import type {
	ResumeAnalysis,
	ResumeAnalysisDraft,
	ResumeAnalysisEditStatuses,
	ResumeEdit,
} from "@stackk-career/schemas/ai/resume-analysis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useState } from "react";
import { toast } from "sonner";
import { ResumeEditorAnalysisPanel } from "@/components/domains/resume-editor/resume-analysis-panel";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

interface ResumeStreams {
	"resume-analysis": DeepPartial<ResumeAnalysisDraft>;
}

type CachedAnalysis = {
	id: string;
	analysis: ResumeAnalysis;
	editStatuses: ResumeAnalysisEditStatuses;
} | null;

type ApplyEditsResult = AppRouterOutputs["resumeAnalyses"]["applyEdit"];
/** Block content mutations the server applied, handed to the route to sync its live form. */
export type AppliedEditRewrites = ApplyEditsResult["rewrites"];

/** Surface per-edit apply outcomes to the user without pretending everything succeeded. */
function notifyApplyResults(results: ApplyEditsResult["results"], options: { all: boolean }): void {
	const applied = results.filter((entry) => entry.status === "applied").length;
	const unresolved = results.filter((entry) => entry.status === "stale" || entry.status === "failed").length;

	if (options.all) {
		if (applied === 0 && unresolved === 0) {
			toast.info("No hay mejoras de un clic para aplicar.");
			return;
		}
		const parts = [applied > 0 ? `${applied} aplicada${applied === 1 ? "" : "s"}` : null];
		if (unresolved > 0) {
			parts.push(`${unresolved} sin aplicar`);
		}
		const message = parts.filter(Boolean).join(" · ");
		if (unresolved > 0) {
			toast.warning(message);
		} else {
			toast.success(message);
		}
		return;
	}

	const [single] = results;
	if (!single) {
		return;
	}
	if (single.status === "applied") {
		toast.success("Mejora aplicada");
		return;
	}
	if (single.status === "stale") {
		toast.warning("El contenido del CV cambió; vuelve a analizarlo antes de aplicar.");
		return;
	}
	if (single.status === "failed") {
		toast.error("No se pudo aplicar la mejora.");
	}
}

export function ResumeAnalysisSection({
	resumeId,
	hasJobExperience,
	onEditsApplied,
	onViewSection,
}: {
	resumeId: string;
	hasJobExperience: boolean;
	onEditsApplied?: (rewrites: AppliedEditRewrites) => void;
	onViewSection?: (edit: ResumeEdit) => void;
}) {
	const queryClient = useQueryClient();
	const [runHandle, setRunHandle] = useState<{ runId: string; accessToken: string; analysisId: string } | null>(null);

	const cachedAnalysisOptions = orpc.resumes.getResumeAnalysis.queryOptions({
		input: { resumeId },
		staleTime: Number.POSITIVE_INFINITY,
	});
	const cachedAnalysis = useQuery(cachedAnalysisOptions);

	const jobTarget = useQuery(orpc.resumes.getJobTarget.queryOptions({ input: { resumeId } }));
	const hasJobTarget = jobTarget.data?.status === "ready";

	const resumeQueryKey = orpc.resumes.get.queryOptions({ input: { id: resumeId } }).queryKey;

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

	const handleApplyResult = (result: ApplyEditsResult, options: { all: boolean }) => {
		queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, (prev) =>
			prev ? { ...prev, editStatuses: result.editStatuses } : prev
		);
		if (result.rewrites.length > 0) {
			onEditsApplied?.(result.rewrites);
		}
		if (result.rewrites.length > 0 || result.deletedRootBlockIds.length > 0) {
			queryClient.invalidateQueries({ queryKey: resumeQueryKey });
		}
		notifyApplyResults(result.results, options);
	};

	const applyEdit = useMutation(
		orpc.resumeAnalyses.applyEdit.mutationOptions({
			onSuccess: (result) => handleApplyResult(result, { all: false }),
			onError: (mutationError) => {
				toast.error(mutationError.message || "No se pudo aplicar la mejora.");
			},
		})
	);

	const applyAllEdits = useMutation(
		orpc.resumeAnalyses.applyAllEdits.mutationOptions({
			onSuccess: (result) => handleApplyResult(result, { all: true }),
			onError: (mutationError) => {
				toast.error(mutationError.message || "No se pudieron aplicar las mejoras.");
			},
		})
	);

	const setEditDismissed = useMutation(
		orpc.resumeAnalyses.setEditDismissed.mutationOptions({
			onMutate: async ({ editId, dismissed }) => {
				await queryClient.cancelQueries({ queryKey: cachedAnalysisOptions.queryKey });
				const previous = queryClient.getQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey);
				queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, (prev) => {
					if (!prev) {
						return prev;
					}
					const next = { ...prev.editStatuses };
					if (dismissed) {
						next[editId] = { status: "dismissed", dismissedAt: Date.now() };
					} else if (next[editId]?.status === "dismissed") {
						delete next[editId];
					}
					return { ...prev, editStatuses: next };
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

	const editStatuses = cachedAnalysis.data?.editStatuses;

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
		: (cachedData ?? streamedAnalysis);

	const handleAnalyze = () => {
		const parentAnalysisId = cachedAnalysis.data?.id;
		setRunHandle(null);
		queryClient.setQueryData<CachedAnalysis>(cachedAnalysisOptions.queryKey, null);
		initiateAnalysis.mutate({ resumeId, parentAnalysisId });
	};

	const handleApply = (edit: ResumeEdit) => {
		if (!(activeAnalysisId && edit.editId)) {
			return;
		}
		applyEdit.mutate({ analysisId: activeAnalysisId, editId: edit.editId });
	};

	const handleApplyAll = () => {
		if (!activeAnalysisId) {
			return;
		}
		applyAllEdits.mutate({ analysisId: activeAnalysisId });
	};

	const handleDismiss = (editId: string, dismissed: boolean) => {
		if (!activeAnalysisId) {
			return;
		}
		setEditDismissed.mutate({ analysisId: activeAnalysisId, editId, dismissed });
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
			editStatuses={editStatuses}
			error={error}
			hasJobTarget={hasJobTarget}
			isApplyingAll={applyAllEdits.isPending}
			isStreaming={isStreaming}
			onApplyAll={activeAnalysisId ? handleApplyAll : undefined}
			onApplyEdit={activeAnalysisId ? handleApply : undefined}
			onDismissEdit={activeAnalysisId ? handleDismiss : undefined}
			onRetry={handleAnalyze}
			onViewSection={onViewSection}
			pendingEditId={applyEdit.isPending ? applyEdit.variables?.editId : undefined}
		/>
	);
}

import { ArrowBendUpRightIcon, CaretCircleLeftIcon, CaretCircleRightIcon } from "@phosphor-icons/react";
import type { k02FastAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-fast-analysis";
import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import type { ResumeAnalysis } from "@stackk-career/schemas/ai/resume-analysis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useRealtimeRun, useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { mergeResumeParserEvents } from "@/components/domains/resumes/lib/map-parser-phase";
import { ResumeAnalysisPanel } from "@/components/domains/setup.analysis/resume-analysis";
import { OnboardingChat } from "@/components/domains/setup.chat/onboarding-chat";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Matrix, wave } from "@/components/ui/matrix";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const setupSearchSchema = z.object({
	step: z.enum(["chat"]).optional(),
	analysisStatus: z.enum(["idle", "complete", "error", "aborted"]).optional(),
	generationId: z.string().optional(),
	storeId: z.string().optional(),
});

export const Route = createFileRoute("/_protected/setup")({
	component: RouteComponent,
	validateSearch: setupSearchSchema,
	beforeLoad: ({ search }) => {
		if (search.step && !search.generationId) {
			throw redirect({ to: "/setup", search: {}, replace: true });
		}
	},
});

function RouteComponent() {
	const navigate = useNavigate();
	const search = Route.useSearch();

	const createGeneration = useMutation(
		orpc.generations.create.mutationOptions({
			onSuccess: ({ id }) => {
				navigate({
					from: Route.fullPath,
					search: { step: "chat", generationId: id },
				});
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo iniciar la sesión.");
			},
		})
	);

	if (!(search.step && search.generationId)) {
		return (
			<main className="grid place-items-center p-4">
				<Frame className="min-w-2xl max-w-2xl">
					<FrameHeader className="flex-row gap-2">
						<Matrix cols={8} frames={wave} loop rows={8} size={4} />

						<div>
							<FrameTitle className="font-light text-2xl tracking-tight">👋 Hola, empecemos!</FrameTitle>
							<FrameDescription>v.0.1 Stackk Career</FrameDescription>
						</div>
					</FrameHeader>

					<FramePanel className="grid gap-2 text-sm">
						<p>Estamos complacidos en verte tomar el primer paso para mejorar tu futuro laboral.</p>

						<p>
							Al utilizar Stackk Career, te aseguramos que obtendrás el 100% de entrevistas. Queremos verte triunfar,
							así que empecemos de una vez conociendo un poco más de ti!
						</p>

						<p className="text-success italic tracking-tight">- The Founders</p>
					</FramePanel>

					<FrameFooter className="flex justify-end gap-2">
						<Button render={<Link to="/dash" />} variant="ghost-muted">
							Explorar app <ArrowBendUpRightIcon />
						</Button>

						<Button
							disabled={createGeneration.isPending}
							loading={createGeneration.isPending}
							onClick={() => createGeneration.mutate({ title: "Onboarding", summary: "Conociendo al usuario" })}
						>
							Continuar <CaretCircleRightIcon />
						</Button>
					</FrameFooter>
				</Frame>
			</main>
		);
	}

	return <SetupChatView fileId={search.storeId} generationId={search.generationId} />;
}

interface ResumeStreams {
	"resume-analysis": DeepPartial<ResumeAnalysis>;
}

function SetupChatView({ fileId, generationId }: { fileId: string | undefined; generationId: string }) {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const queryClient = useQueryClient();
	const hasStartedRef = useRef(false);
	const [runHandle, setRunHandle] = useState<{ runId: string; accessToken: string } | null>(null);

	const cachedAnalysisOptions = orpc.generations.getResumeAnalysis.queryOptions({
		input: { generationId },
		staleTime: Number.POSITIVE_INFINITY,
	});
	const cachedAnalysis = useQuery(cachedAnalysisOptions);

	const initiateAnalysis = useMutation(
		orpc.agents.triggerK02FastAnalysis.mutationOptions({
			onSuccess: ({ runId, publicAccessToken }) => {
				setRunHandle({ runId, accessToken: publicAccessToken });
			},
			onError: (mutationError) => {
				toast.error(mutationError.message || "No se pudo iniciar el análisis.");
				navigate({ to: Route.fullPath, search: (prev) => ({ ...prev, analysisStatus: "error" }) });
			},
		})
	);

	const hasCached = Boolean(cachedAnalysis.data);

	useEffect(() => {
		if (hasStartedRef.current || !(fileId && generationId)) {
			return;
		}
		if (cachedAnalysis.isLoading) {
			return;
		}
		if (hasCached) {
			hasStartedRef.current = true;
			return;
		}
		hasStartedRef.current = true;
		initiateAnalysis.mutate({ generationId });
	}, [fileId, generationId, cachedAnalysis.isLoading, hasCached, initiateAnalysis]);

	const {
		run,
		streams,
		error: realtimeError,
	} = useRealtimeRunWithStreams<typeof k02FastAnalysisTask, ResumeStreams>(runHandle?.runId, {
		accessToken: runHandle?.accessToken,
		enabled: Boolean(runHandle),
		onComplete: () => {
			queryClient.invalidateQueries({ queryKey: cachedAnalysisOptions.queryKey });
		},
	});

	const streamedAnalysis = streams["resume-analysis"]?.at(-1);
	const analysisData: DeepPartial<ResumeAnalysis> | undefined = cachedAnalysis.data ?? streamedAnalysis;

	const runStatus = run?.status;
	const isCompleted = hasCached || runStatus === "COMPLETED";
	const isFailed =
		runStatus === "FAILED" ||
		runStatus === "CANCELED" ||
		runStatus === "CRASHED" ||
		runStatus === "SYSTEM_FAILURE" ||
		runStatus === "TIMED_OUT" ||
		runStatus === "EXPIRED";
	const isRunActive = Boolean(runHandle) && runStatus === "EXECUTING";
	const isStreaming = initiateAnalysis.isPending || isRunActive;
	const error =
		realtimeError ??
		(isFailed ? new Error("Algo ocurrió con el analisis, por favor intenta nuevamente en unos minutos") : undefined);

	useEffect(() => {
		if (isCompleted && search.analysisStatus !== "complete") {
			navigate({ to: Route.fullPath, search: (prev) => ({ ...prev, analysisStatus: "complete" }) });
			return;
		}
		if (isFailed && search.analysisStatus !== "error") {
			navigate({ to: Route.fullPath, search: (prev) => ({ ...prev, analysisStatus: "error" }) });
		}
	}, [isCompleted, isFailed, search.analysisStatus, navigate]);

	const showAnalysis = Boolean(fileId);
	const isAnalysisComplete = isCompleted;

	const { data: session } = authClient.useSession();
	const userId = session?.user?.id;
	const realtimeTokenQuery = useQuery({
		...orpc.viewer.realtimeToken.queryOptions(),
		enabled: Boolean(userId && fileId),
		staleTime: 29 * 60 * 1000,
	});
	const draftAccessToken = realtimeTokenQuery.data?.token;
	const hasDraftSession = Boolean(draftAccessToken && fileId && userId);

	const parserRunIdRaw = run?.metadata?.resumeParserRunId;
	const parserRunId = typeof parserRunIdRaw === "string" ? parserRunIdRaw : undefined;
	const { run: parserRun } = useRealtimeRun<typeof resumeParserTask>(parserRunId, {
		accessToken: draftAccessToken,
		enabled: Boolean(parserRunId && draftAccessToken),
	});
	const parserEvents = mergeResumeParserEvents(parserRun?.metadata as Record<string, unknown> | null | undefined);
	const isParserRunning = Boolean(parserRun) && parserRun?.status === "EXECUTING";

	return (
		<section className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
			<nav className="flex justify-between pt-4">
				<Button render={<Link to="/setup" />} variant="ghost-muted">
					<CaretCircleLeftIcon /> Volver
				</Button>

				<Button render={<Link to="/dash" />} variant={isAnalysisComplete ? "ghost" : "ghost-muted"}>
					{isAnalysisComplete ? "Ir a la app" : "Omitir por ahora"} <CaretCircleRightIcon />
				</Button>
			</nav>

			<main className={cn("grid min-h-full w-full max-w-6xl gap-4", showAnalysis && "lg:grid-cols-2")}>
				<Frame className="max-h-[85svh] min-w-0">
					<OnboardingChat
						isAnalysisStreaming={isStreaming}
						isParserStreaming={isParserRunning}
						parserEvents={parserEvents}
					/>

					{isAnalysisComplete && (
						<BlurFade>
							<FrameFooter className="flex justify-end">
								<Button render={<Link to="/dash" />}>
									Ir a la app <CaretCircleRightIcon />
								</Button>
							</FrameFooter>
						</BlurFade>
					)}
				</Frame>

				{showAnalysis && (
					<BlurFade className="flex max-h-[85svh] min-w-0 flex-col gap-3">
						<ResumeAnalysisPanel
							analysis={analysisData}
							className="min-h-0 flex-1"
							draft={
								hasDraftSession && draftAccessToken && userId && fileId
									? { accessToken: draftAccessToken, fileId, userId }
									: undefined
							}
							error={error}
							isStreaming={isStreaming && !hasCached}
						/>
					</BlurFade>
				)}
			</main>
		</section>
	);
}

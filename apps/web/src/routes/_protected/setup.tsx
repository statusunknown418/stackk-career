import { CaretCircleLeftIcon, CaretCircleRightIcon } from "@phosphor-icons/react";
import { usePostHog } from "@posthog/react";
import type { k02FastAnalysisTask } from "@stackk-career/jobs/trigger/tasks/k02-fast-analysis";
import type { resumeParserTask } from "@stackk-career/jobs/trigger/tasks/resume-parser";
import type { ResumeAnalysis } from "@stackk-career/schemas/ai/resume-analysis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useRealtimeRun, useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { mergeResumeParserEvents } from "@/components/domains/resumes/lib/map-parser-phase";
import { ResumeAnalysisPanel } from "@/components/domains/setup.analysis/resume-analysis";
import { OnboardingChat } from "@/components/domains/setup.chat/onboarding-chat";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Frame, FrameFooter } from "@/components/ui/frame";
import { Matrix, wave } from "@/components/ui/matrix";
import { authClient } from "@/lib/auth-client";
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

	const { generationId, storeId } = search;
	const showChat = Boolean(search.step && generationId);
	const showAnalysis = Boolean(storeId);

	// If we have uploaded a resume file, switch to the split-screen analysis view
	if (generationId && showChat && showAnalysis) {
		return <SetupChatView fileId={storeId} generationId={generationId} />;
	}

	return (
		<div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-background">
			{/* Background Vibe / Ambient lights */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				{/* Glowing ambient blob 1 */}
				<div
					className="absolute -top-[30%] -left-[10%] h-[70%] w-[70%] animate-pulse rounded-full bg-primary/8 blur-[100px] dark:bg-primary/5"
					style={{ animationDuration: "8s" }}
				/>
				{/* Glowing ambient blob 2 */}
				<div
					className="absolute -right-[10%] -bottom-[30%] h-[70%] w-[70%] animate-pulse rounded-full bg-info/8 blur-[100px] dark:bg-info/5"
					style={{ animationDuration: "12s" }}
				/>
				{/* Fine dot grid overlay */}
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]" />
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:18px_18px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
			</div>

			{/* Header Nav */}
			<header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
				<div className="flex items-center gap-2">
					<Matrix cols={6} frames={wave} loop rows={6} size={3} />
					<span className="font-semibold text-foreground text-sm uppercase tracking-tight">Assendia</span>
				</div>
				<div className="flex items-center gap-3">
					{showChat && (
						<Button render={<Link to="/setup" />} variant="ghost-muted">
							<CaretCircleLeftIcon className="size-4" /> Volver
						</Button>
					)}
					<Button render={<Link to="/dash" />} variant="ghost-muted">
						{showChat ? "Omitir por ahora" : "Explorar app"} <CaretCircleRightIcon className="size-4" />
					</Button>
				</div>
			</header>

			{/* Welcome & Questionnaire Content */}
			<main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-12">
				<AnimatePresence mode="wait">
					{showChat ? (
						<motion.div
							animate={{ opacity: 1, y: 0, scale: 1 }}
							className="flex w-full flex-1 flex-col"
							exit={{ opacity: 0, y: -15, scale: 0.98 }}
							initial={{ opacity: 0, y: 15, scale: 0.98 }}
							key="questions"
							transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
						>
							<OnboardingChat />
						</motion.div>
					) : (
						<motion.div
							animate={{ opacity: 1, y: 0, scale: 1 }}
							className="flex max-w-2xl flex-col items-center text-center"
							exit={{ opacity: 0, y: -15, scale: 0.98 }}
							initial={{ opacity: 0, y: 15, scale: 0.98 }}
							key="welcome"
							transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
						>
							<div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary text-xs">
								<span className="relative flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
								</span>
								v.0.1 Assendia
							</div>

							<h1 className="mb-6 text-balance bg-linear-to-b from-foreground via-foreground/95 to-foreground/80 bg-clip-text text-4xl text-transparent leading-tighter tracking-tight sm:text-5xl">
								Diseña tu futuro profesional con Assendia
							</h1>

							<div className="mb-10 space-y-4 text-balance text-base text-muted-foreground leading-relaxed sm:text-lg">
								<p>
									Estamos listos para ayudarte a destacar y conseguir el empleo que realmente deseas. A través de este
									breve cuestionario interactivo, personalizaremos tu perfil, analizaremos tus preferencias y
									optimizaremos tu búsqueda de trabajo.
								</p>
								<p className="mt-6 text-foreground/60 text-sm italic">— El equipo de Assendia</p>
							</div>

							<div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto">
								<Button
									className="w-full sm:w-auto"
									disabled={createGeneration.isPending}
									loading={createGeneration.isPending}
									onClick={() => createGeneration.mutate({ title: "Onboarding", summary: "Conociendo al usuario" })}
									size="xl"
								>
									Comenzar cuestionario <CaretCircleRightIcon className="size-5" />
								</Button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</main>
		</div>
	);
}

interface ResumeStreams {
	"resume-analysis": DeepPartial<ResumeAnalysis>;
}

function useResumeAnalysis(generationId: string, fileId: string | undefined) {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const queryClient = useQueryClient();
	const posthog = usePostHog();
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
			posthog?.capture("resume_score_generated", { generationId });
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

	return {
		run,
		analysisData,
		isCompleted,
		isFailed,
		isStreaming,
		error,
		hasCached,
	};
}

function useResumeParser(run: { metadata?: Record<string, unknown> | null } | undefined, fileId: string | undefined) {
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

	return {
		userId,
		draftAccessToken,
		hasDraftSession,
		parserEvents,
		isParserRunning,
	};
}

function SetupChatView({ fileId, generationId }: { fileId: string | undefined; generationId: string }) {
	const { run, analysisData, isCompleted, isStreaming, error, hasCached } = useResumeAnalysis(generationId, fileId);

	const { userId, draftAccessToken, hasDraftSession, parserEvents, isParserRunning } = useResumeParser(run, fileId);

	const isAnalysisComplete = isCompleted;

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

			<main className="grid min-h-full w-full max-w-6xl gap-4 lg:grid-cols-2">
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
			</main>
		</section>
	);
}

import { createId } from "@paralleldrive/cuid2";
import { TrashSimpleIcon } from "@phosphor-icons/react";
import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import { COVER_LETTER_OBJECT_TYPE, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { normalizeTemplate } from "@stackk-career/schemas/api/letters";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LettersArtifactPanel } from "@/components/domains/letters/letters-artifact-panel";
import { LettersChatPanel } from "@/components/domains/letters/letters-chat-panel";
import { LettersJobContextSheet } from "@/components/domains/letters/letters-job-context-sheet";
import Loader from "@/components/loader";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { type Tour, TourProvider, useTour } from "@/components/ui/tour";
import { orpc } from "@/utils/orpc";

interface LetterStreams {
	"cover-letter-artifact": DeepPartial<CoverLetter>;
}

interface RunHandle {
	accessToken: string;
	runId: string;
}

// The ?v param only counts when it points to a currently valid version; a stale/foreign id is
// ignored (falls back to the latest) so the view and the save target never diverge.
function resolveValidVersionId(raw: string | null, versions: ReadonlyArray<{ id: string }>): string | null {
	if (raw && versions.some((m) => m.id === raw)) {
		return raw;
	}
	return null;
}

// Dialog copy is ALWAYS Spanish (app UI language; letter language only affects the artifact).
// The cap comes from the plan (returned by `get`).
function limitDialogCopy(maxVersions: number): { description: string; ok: string; title: string } {
	return {
		title: "Límite de generaciones alcanzado",
		description: `Has alcanzado el límite de ${maxVersions} versiones para esta carta de presentación. Si deseas realizar más cambios, te sugerimos crear una nueva carta.`,
		ok: "Entendido",
	};
}

// Which letter to show: while generating, ONLY the stream (not the old letter during the
// round-trip); when idle, the selected version (?v) or the latest persisted one.
function resolveDisplayedArtifact(input: {
	cachedArtifact: DeepPartial<CoverLetter> | undefined;
	isGenerating: boolean;
	selectedArtifact: DeepPartial<CoverLetter> | undefined;
	streamedArtifact: DeepPartial<CoverLetter> | undefined;
}): DeepPartial<CoverLetter> | undefined {
	if (input.isGenerating) {
		return input.streamedArtifact;
	}
	return input.streamedArtifact ?? input.selectedArtifact ?? input.cachedArtifact;
}

// The pending skeleton mirrors the workspace's real layout — a chat sidebar plus a single
// letter-document card with the same container (max-w-3xl, bordered card) and section order
// (letterhead → date → greeting → body → closing → signature) the streaming view renders, so
// the hand-off from loader to generation has no layout shift.
function LetterPagePending() {
	return (
		<section className="grid h-[calc(100svh-4rem)] gap-4 p-4 md:grid-cols-[minmax(22rem,34%)_minmax(0,1fr)] md:grid-rows-1">
			<Frame>
				<FrameHeader>
					<Skeleton className="h-4 w-28 rounded-full" />
				</FrameHeader>
				<FramePanel className="flex flex-1 flex-col gap-3">
					<Skeleton className="h-3 w-full rounded-full" />
					<Skeleton className="h-3 w-4/5 rounded-full" />
					<Skeleton className="mt-2 h-16 w-full rounded-xl" />
					<Skeleton className="mt-auto h-24 w-full rounded-xl" />
				</FramePanel>
			</Frame>

			<Frame>
				<FrameHeader>
					<Skeleton className="h-5 w-24 rounded-full" />
				</FrameHeader>
				<FramePanel className="flex flex-1 flex-col overflow-y-auto bg-muted/35 p-6">
					<div className="mx-auto w-full max-w-3xl">
						<article className="relative flex w-full flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm md:p-10">
							<div className="flex flex-col gap-2">
								<Skeleton className="h-7 w-1/2 rounded-full" />
								<Skeleton className="h-3 w-1/3 rounded-full" />
								<div className="mt-1 flex flex-wrap gap-2">
									<Skeleton className="h-3 w-28 rounded-full" />
									<Skeleton className="h-3 w-20 rounded-full" />
									<Skeleton className="h-3 w-24 rounded-full" />
								</div>
								<div className="mt-2 w-full border-border border-b" />
							</div>

							<div className="flex justify-end">
								<Skeleton className="h-3 w-24 rounded-full" />
							</div>

							<Skeleton className="h-4 w-40 rounded-full" />

							<div className="flex flex-col gap-2">
								<Skeleton className="h-3 w-full rounded-full" />
								<Skeleton className="h-3 w-11/12 rounded-full" />
								<Skeleton className="h-3 w-full rounded-full" />
								<Skeleton className="h-3 w-5/6 rounded-full" />
								<Skeleton className="h-3 w-4/5 rounded-full" />
								<Skeleton className="h-3 w-2/3 rounded-full" />
							</div>

							<div className="flex flex-col gap-2">
								<Skeleton className="h-3 w-3/4 rounded-full" />
								<Skeleton className="h-3 w-1/2 rounded-full" />
							</div>

							<Skeleton className="mt-6 h-4 w-32 rounded-full" />
						</article>
					</div>
				</FramePanel>
			</Frame>
		</section>
	);
}

export const Route = createFileRoute("/_protected/dash/letters/$generationId")({
	component: RouteComponent,
	pendingComponent: LetterPagePending,
	// `v` = artifact-message id of the viewed version. Lives in the URL so it survives refresh
	// and is shareable; absent = show the latest version.
	validateSearch: (search: Record<string, unknown>): { v?: string } => ({
		v: typeof search.v === "string" && search.v.length > 0 ? search.v : undefined,
	}),
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			orpc.letters.get.queryOptions({ input: { generationId: params.generationId } })
		),
});

const LETTER_DETAIL_TOUR_KEY = "stackk:letter-detail-tour-seen";

const letterDetailTours: Tour[] = [
	{
		id: "letter-detail",
		steps: [
			{
				align: "start",
				content:
					"Casey la redacta a partir de tu CV y del puesto. Edítala en línea: haz clic en cualquier párrafo para ajustarlo.",
				id: "letter-artifact",
				side: "left",
				title: "Tu carta",
			},
			{
				align: "end",
				content: "Copia el texto, descarga un PDF listo para enviar o regenera la carta con otro tono.",
				id: "letter-toolbar",
				side: "bottom",
				title: "Cópiala, descárgala o regenérala",
			},
			{
				align: "start",
				content:
					"Describe en tus palabras qué cambiar —tono, longitud, resaltar un logro— y Casey genera una nueva versión.",
				id: "letter-chat-input",
				side: "top",
				title: "Pídele cambios a Casey",
			},
			{
				align: "start",
				content: "Cada versión que genera Casey se guarda aquí. Haz clic para volver a cualquiera cuando quieras.",
				id: "letter-versions",
				side: "right",
				title: "Tus versiones",
			},
		],
	},
];

// Keeps the tour's branching out of the workspace component (cognitive-complexity budget).
// Fires once, gated on `ready` so it never starts before every target (notably the toolbar,
// which only mounts with content) is in the DOM.
function useAutoStartLetterTour(
	hasData: boolean,
	isGenerating: boolean,
	hasArtifact: boolean,
	hasLatestArtifact: boolean,
	startTour: (tourId: string) => void
): boolean {
	// `ready` also gates the manual "Cómo funciona" trigger (returned to the caller): the
	// toolbar step's target only mounts with content, so the tour must wait for an idle,
	// rendered letter or it would stall on that step.
	const ready = hasData && !isGenerating && (hasArtifact || hasLatestArtifact);
	const startedRef = useRef(false);
	useEffect(() => {
		if (startedRef.current || typeof window === "undefined" || !ready) {
			return;
		}
		if (localStorage.getItem(LETTER_DETAIL_TOUR_KEY)) {
			return;
		}
		startedRef.current = true;
		localStorage.setItem(LETTER_DETAIL_TOUR_KEY, "1");
		startTour("letter-detail");
	}, [ready, startTour]);
	return ready;
}

function RouteComponent() {
	return (
		<TourProvider tours={letterDetailTours}>
			<LetterWorkspace />
		</TourProvider>
	);
}

/** Delete-confirm state + the `letters.delete` mutation, lifted out of the workspace component
 *  to keep its cognitive complexity within budget. */
function useLetterDeletion(generationId: string) {
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();
	const [isOpen, setIsOpen] = useState(false);

	const mutation = useMutation(
		orpc.letters.delete.mutationOptions({
			onError: (error) => {
				toast.error(error.message || "No se pudo borrar la carta");
			},
			onSuccess: async () => {
				toast.success("Carta borrada");
				setIsOpen(false);
				await queryClient.invalidateQueries({ queryKey: orpc.letters.list.queryOptions().queryKey });
				navigate({ to: "/dash/letters" });
			},
		})
	);

	const { mutateAsync } = mutation;
	const open = useCallback(() => setIsOpen(true), []);
	const confirm = useCallback(async () => {
		await mutateAsync({ generationId });
	}, [generationId, mutateAsync]);

	return { confirm, isOpen, isPending: mutation.isPending, open, setIsOpen };
}

/** Confirmation dialog for deleting a cover letter (mirrors the resume delete flow). */
function DeleteLetterDialog({
	isPending,
	onConfirm,
	onOpenChange,
	open,
}: {
	isPending: boolean;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	return (
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Estás seguro que quieres borrar esta carta?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará la carta junto con todas sus versiones.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<Button disabled={isPending} render={<AlertDialogClose />} variant="outline">
						No, retrocede porfa
					</Button>
					<Button disabled={isPending} onClick={onConfirm} variant="destructive">
						{isPending ? <Loader /> : <TrashSimpleIcon />}
						Borrar
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function LetterWorkspace() {
	const { generationId } = Route.useParams();
	const queryClient = useQueryClient();
	const { data } = useQuery(orpc.letters.get.queryOptions({ input: { generationId } }));
	const lettersGetKey = orpc.letters.get.queryKey({ input: { generationId } });
	const { start: startTour } = useTour();

	const [runHandle, setRunHandle] = useState<RunHandle | null>(null);
	const [showLimitDialog, setShowLimitDialog] = useState(false);
	const [showJobContext, setShowJobContext] = useState(false);

	// Selected version lives in the URL (?v=<messageId>). No `v` = latest version.
	const navigate = Route.useNavigate();
	const rawSelectedVersionId = Route.useSearch().v ?? null;
	const selectVersion = useCallback(
		(messageId: string) => {
			navigate({ replace: true, search: (prev) => ({ ...prev, v: messageId }) });
		},
		[navigate]
	);
	const clearSelectedVersion = useCallback(() => {
		navigate({ replace: true, search: (prev) => ({ ...prev, v: undefined }) });
	}, [navigate]);

	const [triggering, setTriggering] = useState(false);
	const autoTriggeredRef = useRef(false);

	const inFlightRef = useRef(false);

	// Valid versions = non-failed artifacts. Numbering, quota and cards all derive from this
	// list so they match (a crashed run is not a navigable version).
	const coverLetterMessages = data
		? data.messages.filter((m) => m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE && !m.error)
		: [];
	const generationCount = coverLetterMessages.length;
	// Plan's version cap (returned by `get`). No data yet → no cap.
	const maxVersions = data?.maxVersions ?? Number.POSITIVE_INFINITY;

	const selectedMessageId = resolveValidVersionId(rawSelectedVersionId, coverLetterMessages);

	const triggerMutation = useMutation(
		orpc.letters.trigger.mutationOptions({
			onMutate: async ({ extraPrompt }) => {
				setTriggering(true);
				await queryClient.cancelQueries({ queryKey: lettersGetKey });
				const previous = queryClient.getQueryData<typeof data>(lettersGetKey);
				queryClient.setQueryData<typeof data>(lettersGetKey, (old) => {
					if (!old) {
						return old;
					}
					const maxOrder = old.messages.reduce((acc, m) => Math.max(acc, m.order ?? -1), -1);
					const base = {
						analysisId: null,
						content: null,
						createdAt: new Date(),
						error: null,
						generationId,
						isTool: false,
						model: null,
						object: null,
						parentMessageId: null,
						toolMeta: null,
					};
					const trimmed = extraPrompt?.trim();
					const rows: typeof old.messages = [];
					if (trimmed) {
						rows.push({
							...base,
							id: `optimistic_${createId()}`,
							isAssistant: false,
							objectType: null,
							order: maxOrder + 1,
							text: trimmed,
						});
					}
					rows.push({
						...base,
						id: `optimistic_${createId()}`,
						isAssistant: true,
						objectType: COVER_LETTER_OBJECT_TYPE,
						order: maxOrder + rows.length + 1,
						text: null,
					});
					return { ...old, messages: [...old.messages, ...rows] };
				});
				return { previous };
			},
			onError: (err, _vars, context) => {
				if (context?.previous) {
					queryClient.setQueryData(lettersGetKey, context.previous);
				}
				toast.error(err.message);
			},
			onSuccess: (result) => {
				if (result.runId && result.publicAccessToken) {
					setRunHandle({ accessToken: result.publicAccessToken, runId: result.runId });
				}
				queryClient.invalidateQueries({ queryKey: lettersGetKey });
			},
			onSettled: () => setTriggering(false),
		})
	);

	// Manual user edits to the shown letter (no regeneration, no version consumed). Optimistic:
	// reflect the edit in the cache immediately (rollback on failure) so saving feels instant.
	const updateArtifactMutation = useMutation(
		orpc.letters.updateArtifact.mutationOptions({
			onMutate: async ({ artifact, messageId }) => {
				await queryClient.cancelQueries({ queryKey: lettersGetKey });
				const previous = queryClient.getQueryData<typeof data>(lettersGetKey);
				queryClient.setQueryData<typeof data>(lettersGetKey, (old) => {
					if (!old) {
						return old;
					}
					const messages = old.messages.map((m) => (m.id === messageId ? { ...m, object: artifact } : m));
					// If the most recent artifact was edited, mirror it in `latestArtifact`
					// (the default view when no version is selected).
					const lastArtifact = [...messages]
						.reverse()
						.find((m) => m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE && m.object !== null);
					return {
						...old,
						messages,
						latestArtifact: lastArtifact?.id === messageId ? artifact : old.latestArtifact,
					};
				});
				return { previous };
			},
			onError: (err, _vars, context) => {
				if (context?.previous) {
					queryClient.setQueryData(lettersGetKey, context.previous);
				}
				toast.error(err.message);
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: lettersGetKey });
			},
		})
	);
	const updateArtifactMutateAsync = updateArtifactMutation.mutateAsync;
	const onSaveArtifact = useCallback(
		(messageId: string, edited: CoverLetter) =>
			updateArtifactMutateAsync({ artifact: edited, generationId, messageId }),
		[generationId, updateArtifactMutateAsync]
	);

	// Inline rename of the letter's title (= job position). Optimistic: mirror the new title in
	// the cache immediately (rollback on failure) so the edit feels instant, then invalidate to
	// confirm against the server.
	const updateTitleMutation = useMutation(
		orpc.letters.updateTitle.mutationOptions({
			onMutate: async ({ title }) => {
				await queryClient.cancelQueries({ queryKey: lettersGetKey });
				const previous = queryClient.getQueryData<typeof data>(lettersGetKey);
				queryClient.setQueryData<typeof data>(lettersGetKey, (old) =>
					old ? { ...old, generation: { ...old.generation, title } } : old
				);
				return { previous };
			},
			onError: (err, _vars, context) => {
				if (context?.previous) {
					queryClient.setQueryData(lettersGetKey, context.previous);
				}
				toast.error(err.message);
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: lettersGetKey });
			},
		})
	);
	const updateTitleMutateAsync = updateTitleMutation.mutateAsync;
	const onSaveTitle = useCallback(
		(title: string) => {
			const trimmed = title.trim();
			// The title feeds CASEY's job context on every re-trigger, so it must stay non-empty;
			// also skip no-op saves when the value is unchanged.
			if (!trimmed || trimmed === data?.generation.title) {
				return;
			}
			updateTitleMutateAsync({ generationId, title: trimmed }).catch(() => {
				// Toast already emitted by onError.
			});
		},
		[generationId, data?.generation.title, updateTitleMutateAsync]
	);

	const deletion = useLetterDeletion(generationId);

	const triggerMutateAsync = triggerMutation.mutateAsync;
	const onTriggerAsync = useCallback(
		async (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => {
			if (inFlightRef.current) {
				return;
			}
			if (generationCount >= maxVersions) {
				setShowLimitDialog(true);
				return;
			}
			inFlightRef.current = true;
			try {
				const result = await triggerMutateAsync({ generationId, ...input });
				// Drop ?v only after the trigger confirmed: on failure the user keeps the
				// version they were viewing.
				clearSelectedVersion();
				return result;
			} finally {
				inFlightRef.current = false;
			}
		},
		[generationId, triggerMutateAsync, generationCount, maxVersions, clearSelectedVersion]
	);

	// `id: runHandle?.runId` gives fresh hook state per run. Without it the hook keys its SWR
	// by a mount-stable useId(), dragging the previous COMPLETED run and its chunks into the
	// next one (stale letter with Copy/Download enabled, no spinner).
	const realtime = useRealtimeRunWithStreams<typeof caseyLettersTask, LetterStreams>(runHandle?.runId, {
		accessToken: runHandle?.accessToken,
		enabled: Boolean(runHandle),
		id: runHandle?.runId,
	});

	// Run lifecycle, handled by ONE effect instead of the hook's onComplete (that callback
	// fires once per mount and never resets across runIds, so every regeneration after the
	// first would leave the chat frozen). A run "ends" when finishedAt arrives OR when the
	// subscription dies mid-flight (error): both paths refetch the persisted data first and
	// only then release the handle — releasing earlier empties `streamedArtifact` while the
	// refetch is in flight and the letter would blink out for a second.
	const currentRunFinishedAt = realtime.run?.finishedAt;
	const currentRunStatus = realtime.run?.status;
	const realtimeError = realtime.error;
	// The failed-run retry lives in a ref cleared only on unmount: this effect calls
	// setRunHandle(null), which re-runs it (runHandle is a dep), and a clearTimeout in the
	// regular cleanup would kill the timer right after creating it.
	const failedRunRetryRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(failedRunRetryRef.current), []);
	useEffect(() => {
		if (!(runHandle && (currentRunFinishedAt || realtimeError))) {
			return;
		}
		if (realtimeError && !currentRunFinishedAt) {
			// The toast is the only durable signal: once the handle is released the hook
			// re-keys and the error badge/alert disappear on the next render.
			toast.error("Se perdió la conexión con la generación; recargamos el estado de la carta.");
		}
		let cancelled = false;
		const invalidate = () =>
			queryClient.invalidateQueries({
				queryKey: orpc.letters.get.queryKey({ input: { generationId } }),
			});
		invalidate().finally(() => {
			if (cancelled) {
				return;
			}
			setRunHandle(null);
			// Non-completed run: the task's onFailure stamps `error` on the row in parallel
			// with this refetch. If the refetch won the race, the pending row came back with
			// no error and no object — it would count as an empty clickable "Version N". A
			// short follow-up refetch picks up the error mark and drops it from the numbering.
			if (currentRunStatus !== "COMPLETED") {
				failedRunRetryRef.current = setTimeout(() => {
					invalidate();
				}, 1500);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [runHandle, currentRunFinishedAt, currentRunStatus, realtimeError, queryClient, generationId]);

	// Auto-fire the first draft when the user lands on a freshly created letter (no messages,
	// no persisted artifact). The ref is set BEFORE the mutate and never reset on failure —
	// resetting it caused a retry loop while isEmpty was still true; the user retries manually.
	const isEmpty = data ? data.messages.length === 0 && data.latestArtifact === null : false;
	const isPending = triggerMutation.isPending;
	useEffect(() => {
		if (autoTriggeredRef.current) {
			return;
		}
		if (isEmpty && !runHandle && !isPending) {
			autoTriggeredRef.current = true;
			onTriggerAsync({}).catch(() => {
				// Toast already emitted by onError.
			});
		}
	}, [isEmpty, runHandle, isPending, onTriggerAsync]);

	// While the task streams, prefer the partial chunk from realtime. When idle (no run),
	// fall back to whatever the API last persisted on `messages.object`.
	const streamedArtifact = realtime.streams["cover-letter-artifact"]?.at(-1);
	const selectedMessage = selectedMessageId && data ? data.messages.find((m) => m.id === selectedMessageId) : null;
	const selectedArtifact = selectedMessage?.object
		? (coverLetterSchema.safeParse(selectedMessage.object).data ?? undefined)
		: undefined;
	const cachedArtifact = data?.latestArtifact ?? undefined;
	// Streaming while a run is active and unfinished. Before the first SSE of a new run
	// (realtime.run undefined) we still count as streaming, so the old letter isn't shown with
	// Copy/Download enabled. `!realtime.error` keeps a dead subscription (expired token, dropped
	// SSE) without `finishedAt` from leaving isStreaming true forever.
	const isStreaming = Boolean(runHandle) && !realtime.run?.finishedAt && !realtime.error;

	// "Generating" = active run (isStreaming) or a just-fired trigger (triggering). Both clear
	// on their own lifecycle (mutation settle / finishedAt) — neither can hang.
	const isGenerating = isStreaming || triggering;

	// While generating (from the click, even before the run starts) prefer ONLY the stream so
	// the old letter isn't shown during the Trigger.dev round-trip. `streamedArtifact` is
	// undefined until the first chunk → the panel shows the skeleton immediately. When idle,
	// fall back to the selected / latest persisted version.
	const artifact = resolveDisplayedArtifact({ cachedArtifact, isGenerating, selectedArtifact, streamedArtifact });

	// Auto-scroll to the artifact panel on mobile devices when generation is in progress,
	// so the user gets instant visual feedback of the streaming or skeleton load.
	const artifactPanelRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (isGenerating && typeof window !== "undefined" && window.innerWidth < 768) {
			const timer = setTimeout(() => {
				artifactPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isGenerating]);

	const tourReady = useAutoStartLetterTour(
		Boolean(data),
		isGenerating,
		Boolean(artifact),
		data?.latestArtifact != null,
		startTour
	);

	if (!data) {
		return null;
	}

	const activeMessageId = selectedMessageId || (coverLetterMessages.at(-1)?.id ?? null);
	const activeVersion = coverLetterMessages.findIndex((m) => m.id === activeMessageId) + 1;
	const dialogCopy = limitDialogCopy(maxVersions);
	const jobPositionLabel = data.generation.title ?? "el puesto";
	const linkedResumeTitle = data.resume?.title ?? null;

	return (
		<>
			<section className="grid h-[calc(100svh-4rem)] gap-4 overscroll-y-none p-4 md:grid-cols-[minmax(22rem,34%)_minmax(0,1fr)] md:grid-rows-1">
				<LettersChatPanel
					isPending={isGenerating}
					jobContextSource={data.generation.jobContextSource}
					jobPosition={jobPositionLabel}
					maxVersions={maxVersions}
					messages={data.messages}
					onOpenJobContext={() => setShowJobContext(true)}
					onSaveTitle={onSaveTitle}
					onSelectVersion={selectVersion}
					onStartTour={tourReady ? () => startTour("letter-detail") : undefined}
					onTriggerAsync={onTriggerAsync}
					resumeTitle={linkedResumeTitle}
					selectedMessageId={selectedMessageId}
				/>

				<div className="flex h-full min-h-0 flex-col" ref={artifactPanelRef}>
					<LettersArtifactPanel
						letter={{
							activeMessageId,
							activeVersion: activeVersion > 0 ? activeVersion : 1,
							artifact,
							currentLanguage: data.generation.language,
							generationCount,
							hasContent: Boolean(artifact) || data.latestArtifact !== null,
							maxVersions,
							template: normalizeTemplate(data.generation.template),
						}}
						onRequestDelete={deletion.open}
						onSaveArtifact={onSaveArtifact}
						onTriggerAsync={onTriggerAsync}
						run={{ error: realtimeError, isPending: isGenerating, isStreaming }}
					/>
				</div>
			</section>

			<AlertDialog onOpenChange={setShowLimitDialog} open={showLimitDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{dialogCopy.title}</AlertDialogTitle>
						<AlertDialogDescription>{dialogCopy.description}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button render={<AlertDialogClose />} variant="outline">
							{dialogCopy.ok}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<DeleteLetterDialog
				isPending={deletion.isPending}
				onConfirm={deletion.confirm}
				onOpenChange={deletion.setIsOpen}
				open={deletion.isOpen}
			/>

			<LettersJobContextSheet
				jobContextSource={data.generation.jobContextSource}
				jobPosition={jobPositionLabel}
				jobSummary={data.generation.summary}
				onOpenChange={setShowJobContext}
				open={showJobContext}
				resumeTitle={linkedResumeTitle}
			/>
		</>
	);
}

import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import { COVER_LETTER_OBJECT_TYPE, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LettersArtifactPanel } from "@/components/domains/letters/letters-artifact-panel";
import { LettersChatPanel } from "@/components/domains/letters/letters-chat-panel";
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
import { cn } from "@/lib/utils";
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

// Skeleton shape mirrors a real letter (short greeting, long body, medium closing, short
// signature) and the final layout, so the skeleton → letter transition doesn't jump.
const PENDING_LETTER_SECTIONS = [
	{ bars: ["w-2/5"], key: "greeting", label: "w-16", primary: false },
	{ bars: ["w-full", "w-11/12", "w-5/6", "w-4/5", "w-3/4", "w-2/3"], key: "body", label: "w-20", primary: true },
	{ bars: ["w-3/4", "w-1/2"], key: "closing", label: "w-16", primary: false },
	{ bars: ["w-1/3"], key: "signature", label: "w-14", primary: false },
] as const;

function PendingLetterSection({ bars, label, primary }: { bars: readonly string[]; label: string; primary: boolean }) {
	return (
		<div className={cn("rounded-2xl border bg-card px-4 pt-3.5 pb-4", primary && "min-h-44 flex-1")}>
			<Skeleton className={`mb-3 h-3 rounded-full ${label}`} />
			<div className="flex flex-col gap-2">
				{bars.map((w) => (
					<Skeleton className={`h-3 rounded-full ${w}`} key={w} />
				))}
			</div>
		</div>
	);
}

/** Two-column skeleton while the loader fetches the letter — avoids blank page + spinner. */
function LetterPagePending() {
	return (
		<section className="grid h-[calc(100svh-8rem)] gap-4 p-4 md:grid-cols-[40%_1fr] md:grid-rows-1">
			<Frame>
				<FrameHeader>
					<Skeleton className="h-4 w-2/3 rounded-full" />
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
				<FramePanel className="flex flex-1 flex-col overflow-y-auto">
					<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3">
						{PENDING_LETTER_SECTIONS.map((section) => (
							<PendingLetterSection
								bars={section.bars}
								key={section.key}
								label={section.label}
								primary={section.primary}
							/>
						))}
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

function RouteComponent() {
	const { generationId } = Route.useParams();
	const queryClient = useQueryClient();
	const { data } = useQuery(orpc.letters.get.queryOptions({ input: { generationId } }));
	const lettersGetKey = orpc.letters.get.queryKey({ input: { generationId } });

	// The route owns the trigger mutation so both panels can fire it (chat from
	// the textarea, artifact from the "Regenerar" presets) and the realtime
	// subscription stays attached at this level through the panel re-renders.
	const [runHandle, setRunHandle] = useState<RunHandle | null>(null);
	const [showLimitDialog, setShowLimitDialog] = useState(false);

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
	// Immediate feedback when firing a run: true from click until the mutation settles (then
	// realtime/isStreaming takes over). Tied to the mutation lifecycle, so it can't hang.
	const [triggering, setTriggering] = useState(false);
	const autoTriggeredRef = useRef(false);
	// Prevents two parallel runs (double-click, auto-trigger + manual). Realtime tracks a
	// single runHandle, so simultaneous triggers would lose one.
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

	// Optimistic: reflect the user's instruction bubble + the pending version placeholder in
	// the chat immediately, without waiting for the round-trip. The refetch replaces these
	// rows with the real ones; onError rolls back.
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
							id: `optimistic_${crypto.randomUUID()}`,
							isAssistant: false,
							objectType: null,
							order: maxOrder + 1,
							text: trimmed,
						});
					}
					rows.push({
						...base,
						id: `optimistic_${crypto.randomUUID()}`,
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

	const error = realtime.error;

	if (!data) {
		return null;
	}

	const activeMessageId = selectedMessageId || (coverLetterMessages.at(-1)?.id ?? null);
	const activeVersion = coverLetterMessages.findIndex((m) => m.id === activeMessageId) + 1;
	const dialogCopy = limitDialogCopy(maxVersions);

	return (
		<>
			<section className="grid h-[calc(100svh-8rem)] gap-4 p-4 md:grid-cols-[40%_1fr] md:grid-rows-1">
				<LettersChatPanel
					isPending={isGenerating}
					jobPosition={data.generation.title ?? "el puesto"}
					maxVersions={maxVersions}
					messages={data.messages}
					onSelectVersion={selectVersion}
					onTriggerAsync={onTriggerAsync}
					resumeTitle={data.resume?.title ?? null}
					selectedMessageId={selectedMessageId}
				/>

				<LettersArtifactPanel
					letter={{
						activeMessageId,
						activeVersion: activeVersion > 0 ? activeVersion : 1,
						artifact,
						currentLanguage: data.generation.language,
						generationCount,
						hasContent: Boolean(artifact) || data.latestArtifact !== null,
						maxVersions,
						template: data.generation.template as "centered" | "classic" | "minty" | "blue" | null | undefined,
					}}
					onSaveArtifact={onSaveArtifact}
					onTriggerAsync={onTriggerAsync}
					run={{ error, isPending: isGenerating, isStreaming }}
				/>
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
		</>
	);
}

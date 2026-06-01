import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import { COVER_LETTER_OBJECT_TYPE, coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { MAX_COVER_LETTER_VERSIONS } from "@stackk-career/schemas/api/letters";
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
import { orpc } from "@/utils/orpc";

interface LetterStreams {
	"cover-letter-artifact": DeepPartial<CoverLetter>;
}

interface RunHandle {
	accessToken: string;
	runId: string;
}

function toErrorOrUndefined(value: unknown): Error | undefined {
	if (!value) {
		return;
	}
	if (value instanceof Error) {
		return value;
	}
	return new Error(String(value));
}

function limitDialogCopy(language: CoverLetterLanguage): { description: string; ok: string; title: string } {
	if (language === "en") {
		return {
			title: "Generation limit reached",
			description: `You've reached the maximum of ${MAX_COVER_LETTER_VERSIONS} versions for this cover letter. To make more changes, we suggest creating a new letter.`,
			ok: "Got it",
		};
	}
	return {
		title: "Límite de generaciones alcanzado",
		description: `Has alcanzado el límite máximo de ${MAX_COVER_LETTER_VERSIONS} versiones para esta carta de presentación. Si deseas realizar más cambios, te sugerimos crear una nueva carta.`,
		ok: "Entendido",
	};
}

export const Route = createFileRoute("/_protected/dash/letters/$generationId")({
	component: RouteComponent,
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			orpc.letters.get.queryOptions({ input: { generationId: params.generationId } })
		),
});

function RouteComponent() {
	const { generationId } = Route.useParams();
	const queryClient = useQueryClient();
	const { data } = useQuery(orpc.letters.get.queryOptions({ input: { generationId } }));

	// The route owns the trigger mutation so both panels can fire it (chat from
	// the textarea, artifact from the "Regenerar" presets) and the realtime
	// subscription stays attached at this level through the panel re-renders.
	const [runHandle, setRunHandle] = useState<RunHandle | null>(null);
	const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
	const [showLimitDialog, setShowLimitDialog] = useState(false);
	const autoTriggeredRef = useRef(false);
	// Evita disparar dos runs en paralelo (doble-click, auto-trigger + manual). El realtime
	// solo trackea un runHandle, así que dos triggers simultáneos perderían uno.
	const inFlightRef = useRef(false);

	// Versiones válidas = artifacts NO fallidos. Numeración, cuota y cards derivan todas
	// de esta lista para que coincidan (un run que reventó no es una versión navegable).
	const coverLetterMessages = data
		? data.messages.filter((m) => m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE && !m.error)
		: [];
	const generationCount = coverLetterMessages.length;

	const triggerMutation = useMutation(
		orpc.letters.trigger.mutationOptions({
			onError: (err) => toast.error(err.message),
			onSuccess: (result) => {
				if (result.runId && result.publicAccessToken) {
					setRunHandle({ accessToken: result.publicAccessToken, runId: result.runId });
				}
				queryClient.invalidateQueries({
					queryKey: orpc.letters.get.queryKey({ input: { generationId } }),
				});
			},
		})
	);

	// Ediciones manuales del usuario sobre la carta mostrada (no regenera, no consume versión).
	const updateArtifactMutation = useMutation(
		orpc.letters.updateArtifact.mutationOptions({
			onError: (err) => toast.error(err.message),
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.letters.get.queryKey({ input: { generationId } }),
				});
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
			if (generationCount >= MAX_COVER_LETTER_VERSIONS) {
				setShowLimitDialog(true);
				return;
			}
			inFlightRef.current = true;
			setSelectedMessageId(null);
			try {
				return await triggerMutateAsync({ generationId, ...input });
			} finally {
				inFlightRef.current = false;
			}
		},
		[generationId, triggerMutateAsync, generationCount]
	);

	// `id: runHandle?.runId` da estado fresco del hook por run. Sin esto el hook keya su
	// SWR (run/streams/error) por un useId() estable de por vida del mount, arrastrando el
	// run COMPLETED y los chunks del run anterior al siguiente (carta stale con Copy/Download
	// habilitados, sin spinner). Con id por run, cada generación arranca limpia.
	const realtime = useRealtimeRunWithStreams<typeof caseyLettersTask, LetterStreams>(runHandle?.runId, {
		accessToken: runHandle?.accessToken,
		enabled: Boolean(runHandle),
		id: runHandle?.runId,
	});

	// Completion manejada por NUESTRO effect, no por el onComplete del hook: ese callback
	// dispara UNA sola vez por mount (su hasCalledOnCompleteRef nunca se resetea al cambiar
	// de runId), así que toda regeneración después de la primera dejaría el chat/historial
	// congelado y filtraría runHandle. Acá refrescamos + limpiamos en CADA run que termina.
	const currentRunFinishedAt = realtime.run?.finishedAt;
	useEffect(() => {
		if (runHandle && currentRunFinishedAt) {
			queryClient.invalidateQueries({
				queryKey: orpc.letters.get.queryKey({ input: { generationId } }),
			});
			setRunHandle(null);
		}
	}, [runHandle, currentRunFinishedAt, queryClient, generationId]);

	// Auto-dispara el primer draft cuando el user llega a una carta recién creada
	// (sin mensajes y sin artifact persistido). `autoTriggeredRef` se setea ANTES
	// del mutate y NO se resetea en el catch — si el primer disparo falla, el user
	// re-intenta manual desde el form. Resetearlo causaba loop de retries cuando
	// isPending transicionaba true→false y el effect re-corría con isEmpty todavía
	// true.
	const isEmpty = data ? data.messages.length === 0 && data.latestArtifact === null : false;
	const isPending = triggerMutation.isPending;
	useEffect(() => {
		if (autoTriggeredRef.current) {
			return;
		}
		if (isEmpty && !runHandle && !isPending) {
			autoTriggeredRef.current = true;
			onTriggerAsync({}).catch(() => {
				// Toast emitido por onError. El user re-intenta manualmente vía el form.
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
	// Streaming mientras haya run activo y aún no haya terminado. Si el hook todavía no
	// recibió el primer SSE del run nuevo (realtime.run undefined) también contamos como
	// streaming, para no mostrar la carta vieja con Copy/Download habilitados.
	const isStreaming = Boolean(runHandle) && !realtime.run?.finishedAt;
	const artifact = isStreaming ? streamedArtifact : (streamedArtifact ?? selectedArtifact ?? cachedArtifact);

	const error = toErrorOrUndefined(realtime.error);

	if (!data) {
		return null;
	}

	const activeMessageId = selectedMessageId || (coverLetterMessages.at(-1)?.id ?? null);
	const activeVersion = coverLetterMessages.findIndex((m) => m.id === activeMessageId) + 1;
	const dialogCopy = limitDialogCopy(data.generation.language);

	return (
		<>
			<section className="grid h-[calc(100svh-8rem)] gap-4 p-4 md:grid-cols-[40%_1fr]">
				<LettersChatPanel
					isPending={isPending || isStreaming}
					jobPosition={data.generation.title ?? "el puesto"}
					language={data.generation.language}
					messages={data.messages}
					onSelectVersion={setSelectedMessageId}
					onTriggerAsync={onTriggerAsync}
					resumeTitle={data.resume?.title ?? null}
					selectedMessageId={selectedMessageId}
				/>

				<LettersArtifactPanel
					activeMessageId={activeMessageId}
					activeVersion={activeVersion > 0 ? activeVersion : 1}
					artifact={artifact}
					currentLanguage={data.generation.language}
					error={error}
					generationCount={generationCount}
					hasContent={Boolean(artifact) || data.latestArtifact !== null}
					isPending={isPending}
					isStreaming={isStreaming}
					onSaveArtifact={onSaveArtifact}
					onTriggerAsync={onTriggerAsync}
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

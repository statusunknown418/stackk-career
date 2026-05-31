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

	const coverLetterMessages = data
		? data.messages.filter((m) => m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE)
		: [];
	// El límite cuenta solo versiones NO fallidas — un run que reventó no consume cuota.
	const generationCount = coverLetterMessages.filter((m) => !m.error).length;

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

	const realtime = useRealtimeRunWithStreams<typeof caseyLettersTask, LetterStreams>(runHandle?.runId, {
		accessToken: runHandle?.accessToken,
		enabled: Boolean(runHandle),
		onComplete: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.letters.get.queryKey({ input: { generationId } }),
			});
			setRunHandle(null);
		},
	});

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
	const isStreaming = Boolean(runHandle && realtime.run?.status !== "COMPLETED");
	const artifact = isStreaming ? streamedArtifact : (streamedArtifact ?? selectedArtifact ?? cachedArtifact);

	const error = toErrorOrUndefined(realtime.error);

	if (!data) {
		return null;
	}

	const activeMessageId = selectedMessageId || (coverLetterMessages.at(-1)?.id ?? null);
	const activeVersion = coverLetterMessages.findIndex((m) => m.id === activeMessageId) + 1;

	return (
		<>
			<section className="grid h-[calc(100svh-8rem)] gap-4 p-4 md:grid-cols-[40%_1fr]">
				<LettersChatPanel
					isPending={isPending || isStreaming}
					jobPosition={data.generation.title ?? "el puesto"}
					messages={data.messages}
					onSelectVersion={setSelectedMessageId}
					onTriggerAsync={onTriggerAsync}
					resumeTitle={data.resume?.title ?? null}
					selectedMessageId={selectedMessageId}
				/>

				<LettersArtifactPanel
					activeVersion={activeVersion > 0 ? activeVersion : 1}
					artifact={artifact}
					currentLanguage={data.generation.language}
					error={error}
					generationCount={generationCount}
					hasContent={Boolean(artifact) || data.latestArtifact !== null}
					isPending={isPending}
					isStreaming={isStreaming}
					onTriggerAsync={onTriggerAsync}
				/>
			</section>

			<AlertDialog onOpenChange={setShowLimitDialog} open={showLimitDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Límite de generaciones alcanzado</AlertDialogTitle>
						<AlertDialogDescription>
							Has alcanzado el límite máximo de {MAX_COVER_LETTER_VERSIONS} versiones para esta carta de presentación.
							Si deseas realizar más cambios, te sugerimos crear una nueva carta.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button render={<AlertDialogClose />} variant="outline">
							Entendido
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

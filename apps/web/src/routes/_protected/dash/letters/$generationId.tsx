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
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

interface LetterStreams {
	"cover-letter-artifact": DeepPartial<CoverLetter>;
}

interface RunHandle {
	accessToken: string;
	runId: string;
}

// El ?v de la URL solo vale si apunta a una versión válida actual; un id stale/foráneo se ignora
// (cae a la última versión) para que la vista y el destino de guardado nunca diverjan.
function resolveValidVersionId(raw: string | null, versions: ReadonlyArray<{ id: string }>): string | null {
	if (raw && versions.some((m) => m.id === raw)) {
		return raw;
	}
	return null;
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

const PENDING_BAR_WIDTHS = ["w-11/12", "w-4/5", "w-full", "w-3/4", "w-2/3"] as const;
const PENDING_SECTIONS = ["saludo", "cuerpo", "cierre"] as const;

/** Esqueleto de las 2 columnas mientras el loader trae la carta — evita el blanco + spinner. */
function LetterPagePending() {
	return (
		<section className="grid h-[calc(100svh-8rem)] gap-4 p-4 md:grid-cols-[40%_1fr]">
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
					<FrameTitle className="font-light text-xl tracking-tight">Tu carta de presentación</FrameTitle>
				</FrameHeader>
				<FramePanel className="flex flex-1 flex-col gap-3">
					{PENDING_SECTIONS.map((id) => (
						<div className="rounded-xl border border-border p-4" key={id}>
							<Skeleton className="mb-3 h-3 w-24 rounded-full" />
							<div className="flex flex-col gap-2">
								{PENDING_BAR_WIDTHS.map((w) => (
									<Skeleton className={`h-3 rounded-full ${w}`} key={w} />
								))}
							</div>
						</div>
					))}
				</FramePanel>
			</Frame>
		</section>
	);
}

export const Route = createFileRoute("/_protected/dash/letters/$generationId")({
	component: RouteComponent,
	pendingComponent: LetterPagePending,
	// `v` = id del mensaje-artifact de la versión que se está viendo. Vive en la URL para que
	// sobreviva al refresh y sea compartible; ausente = se muestra la última versión.
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

	// La versión seleccionada vive en la URL (?v=<messageId>): sobrevive al refresh y es
	// compartible. Sin `v` = se muestra la última versión.
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
	// Feedback inmediato al disparar un run: true desde el click hasta que la mutation settlea
	// (ahí el realtime/isStreaming toma el relevo). Atado al ciclo de la mutation, así que no se cuelga.
	const [triggering, setTriggering] = useState(false);
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

	const selectedMessageId = resolveValidVersionId(rawSelectedVersionId, coverLetterMessages);

	const triggerMutation = useMutation(
		orpc.letters.trigger.mutationOptions({
			onMutate: () => setTriggering(true),
			onError: (err) => toast.error(err.message),
			onSuccess: (result) => {
				if (result.runId && result.publicAccessToken) {
					setRunHandle({ accessToken: result.publicAccessToken, runId: result.runId });
				}
				queryClient.invalidateQueries({ queryKey: lettersGetKey });
			},
			onSettled: () => setTriggering(false),
		})
	);

	// Ediciones manuales del usuario sobre la carta mostrada (no regenera, no consume versión).
	// Optimista: reflejamos la edición en el caché al instante (con rollback si falla), así
	// guardar se siente inmediato y no hay parpadeo de refetch al cambiar de versión.
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
					// Si editamos el artifact más reciente, reflejarlo también en `latestArtifact`
					// (lo que muestra la vista por defecto cuando no hay versión seleccionada).
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
			if (generationCount >= MAX_COVER_LETTER_VERSIONS) {
				setShowLimitDialog(true);
				return;
			}
			inFlightRef.current = true;
			clearSelectedVersion();
			try {
				return await triggerMutateAsync({ generationId, ...input });
			} finally {
				inFlightRef.current = false;
			}
		},
		[generationId, triggerMutateAsync, generationCount, clearSelectedVersion]
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
		if (!(runHandle && currentRunFinishedAt)) {
			return;
		}
		// Refrescamos la data persistida y SOLO soltamos el runHandle cuando el refetch terminó.
		// Si lo soltáramos antes, el realtime se deshabilita y `streamedArtifact` se vacía mientras
		// el refetch sigue en vuelo → la carta desaparecería ("Esperando datos") por 1-2s. Esperar
		// al refetch hace el handoff (stream → data persistida) sin parpadeo.
		let cancelled = false;
		queryClient
			.invalidateQueries({
				queryKey: orpc.letters.get.queryKey({ input: { generationId } }),
			})
			.finally(() => {
				if (!cancelled) {
					setRunHandle(null);
				}
			});
		return () => {
			cancelled = true;
		};
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
	// `!realtime.error` evita que un error de suscripción (token expirado, SSE caído) sin `finishedAt`
	// deje `isStreaming` en true para siempre y trabe Regenerar/Copiar/Descargar hasta recargar.
	const isStreaming = Boolean(runHandle) && !realtime.run?.finishedAt && !realtime.error;
	const artifact = isStreaming ? streamedArtifact : (streamedArtifact ?? selectedArtifact ?? cachedArtifact);

	// "Generando" = hay un run activo (isStreaming) o un trigger recién disparado (triggering).
	// `triggering` da feedback inmediato al clickear Regenerar y se limpia al settlear la mutation;
	// `isStreaming` se limpia con `finishedAt`. Ninguno depende de un flag que pueda quedar colgado.
	const isGenerating = isStreaming || triggering;

	const error = realtime.error;

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
					isPending={isGenerating}
					jobPosition={data.generation.title ?? "el puesto"}
					messages={data.messages}
					onSelectVersion={selectVersion}
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
					isPending={isGenerating}
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

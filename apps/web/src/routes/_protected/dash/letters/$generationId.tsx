import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LettersArtifactPanel } from "@/components/domains/letters/letters-artifact-panel";
import { LettersChatPanel } from "@/components/domains/letters/letters-chat-panel";
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
	const { data } = useSuspenseQuery(orpc.letters.get.queryOptions({ input: { generationId } }));

	// The route owns the trigger mutation so both panels can fire it (chat from
	// the textarea, artifact from the "Regenerar" presets) and the realtime
	// subscription stays attached at this level through the panel re-renders.
	const [runHandle, setRunHandle] = useState<RunHandle | null>(null);
	const autoTriggeredRef = useRef(false);

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
		(input: { extraPrompt?: string; language?: CoverLetterLanguage }) => triggerMutateAsync({ generationId, ...input }),
		[generationId, triggerMutateAsync]
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
	// (sin mensajes y sin artifact persistido). `autoTriggeredRef` evita que un
	// invalidate post-éxito re-dispare antes de que aparezcan los mensajes.
	const isEmpty = data.messages.length === 0 && data.latestArtifact === null;
	const isPending = triggerMutation.isPending;
	useEffect(() => {
		if (autoTriggeredRef.current) {
			return;
		}
		if (isEmpty && !runHandle && !isPending) {
			autoTriggeredRef.current = true;
			onTriggerAsync({}).catch(() => {
				// Toast ya emitido por onError; permitimos reintento manual.
				autoTriggeredRef.current = false;
			});
		}
	}, [isEmpty, runHandle, isPending, onTriggerAsync]);

	// While the task streams, prefer the partial chunk from realtime. When idle (no run),
	// fall back to whatever the API last persisted on `messages.object`.
	const streamedArtifact = realtime.streams["cover-letter-artifact"]?.at(-1);
	const cachedArtifact = data.latestArtifact ?? undefined;
	const isStreaming = Boolean(runHandle && realtime.run?.status !== "COMPLETED");
	const artifact = isStreaming ? streamedArtifact : (streamedArtifact ?? cachedArtifact);

	const error = toErrorOrUndefined(realtime.error);

	return (
		<section className="grid h-[calc(100svh-8rem)] gap-4 p-4 md:grid-cols-[40%_1fr]">
			<LettersChatPanel
				isPending={isPending}
				jobPosition={data.generation.title ?? "el puesto"}
				messages={data.messages}
				onTriggerAsync={onTriggerAsync}
				resumeTitle={data.resume?.title ?? null}
			/>

			<LettersArtifactPanel
				artifact={artifact}
				currentLanguage={data.generation.language}
				error={error}
				hasContent={Boolean(artifact) || data.latestArtifact !== null}
				isPending={isPending}
				isStreaming={isStreaming}
				onTriggerAsync={onTriggerAsync}
			/>
		</section>
	);
}

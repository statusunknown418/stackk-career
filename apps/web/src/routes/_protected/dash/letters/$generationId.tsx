import type { caseyLettersTask } from "@stackk-career/jobs/trigger/tasks/casey-letters";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";
import type { DeepPartial } from "ai";
import { useState } from "react";
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

	// The chat panel mutation hands the run handle up here so this component owns
	// the realtime subscription (which needs to outlive the form re-renders).
	const [runHandle, setRunHandle] = useState<RunHandle | null>(null);

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
				generationId={generationId}
				jobPosition={data.generation.title ?? "el puesto"}
				messages={data.messages}
				onRunTriggered={setRunHandle}
				resumeTitle={data.resume?.title ?? null}
			/>

			<LettersArtifactPanel artifact={artifact} error={error} isStreaming={isStreaming} />
		</section>
	);
}

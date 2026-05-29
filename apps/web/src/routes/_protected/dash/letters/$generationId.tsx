import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LettersArtifactPanel } from "@/components/domains/letters/letters-artifact-panel";
import { LettersChatPanel } from "@/components/domains/letters/letters-chat-panel";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/letters/$generationId")({
	component: RouteComponent,
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			orpc.letters.get.queryOptions({ input: { generationId: params.generationId } })
		),
});

function RouteComponent() {
	const { generationId } = Route.useParams();
	const { data } = useSuspenseQuery(orpc.letters.get.queryOptions({ input: { generationId } }));

	const artifact = data.latestArtifact ?? undefined;

	return (
		<section className="grid h-[calc(100svh-8rem)] gap-4 p-4 md:grid-cols-[40%_1fr]">
			<LettersChatPanel
				generationId={generationId}
				jobPosition={data.generation.title ?? "el puesto"}
				messages={data.messages}
				resumeTitle={data.resume?.title ?? null}
			/>

			<LettersArtifactPanel artifact={artifact} error={undefined} isStreaming={false} />
		</section>
	);
}

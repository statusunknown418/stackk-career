import { FileCodeIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteIcon } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { Meter, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/resumes/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data } = useSuspenseQuery(orpc.resumes.list.queryOptions());

	const navigate = useNavigate();

	const { mutateAsync, isPending } = useMutation(
		orpc.resumes.create.mutationOptions({
			onSuccess(data) {
				navigate({
					to: "/dash/resumes/$resumeId",
					params: {
						resumeId: data.resumeId,
					},
				});
			},
			onSettled() {
				queryClient.invalidateQueries(orpc.resumes.list.queryOptions());
			},
		})
	);

	return (
		<section className="space-y-4">
			<section className="flex justify-between gap-4 bg-card px-4 py-5 lg:gap-10">
				<article className="space-y-1">
					<div className="flex items-center gap-1">
						<FileCodeIcon className="size-6" />
						<h1 className="font-light text-2xl">Curriculums</h1>
					</div>

					<FrameDescription>
						Crea y mejora CVs utilizando un agente especialemnte diseñado para los ATS mas comunes
					</FrameDescription>
				</article>

				<Meter className="max-w-sm" max={5} min={0} value={data.length}>
					<div className="flex justify-between">
						<MeterLabel>CVs creados</MeterLabel>
						<MeterValue>{(_formatted, value) => `${value} / 5`}</MeterValue>
					</div>

					<MeterTrack />
				</Meter>
			</section>

			<section className="p-4">
				<Empty className="rounded-xl border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<RouteIcon />
						</EmptyMedia>

						<EmptyTitle>Nada por aquí</EmptyTitle>
						<EmptyDescription>
							Aún no has creado ningun CV, crea uno con <Shimmer>Casey</Shimmer>
						</EmptyDescription>
					</EmptyHeader>

					<EmptyContent>
						<Button disabled={isPending} onClick={() => mutateAsync({})} size="sm">
							{isPending ? <Loader /> : <PlusCircleIcon />}
							Crear CV
						</Button>
					</EmptyContent>
				</Empty>
			</section>
		</section>
	);
}

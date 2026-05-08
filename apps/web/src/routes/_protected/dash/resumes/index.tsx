import { FileMdIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteIcon } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ResumeCard, ResumeCardSkeleton } from "@/components/domains/resumes/resume-card";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/resumes/")({
	component: RouteComponent,
	beforeLoad: () => queryClient.ensureQueryData(orpc.resumes.list.queryOptions()),
});

function RouteComponent() {
	const listQuery = orpc.resumes.list.queryOptions();
	const { data } = useSuspenseQuery(listQuery);

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
				queryClient.invalidateQueries({ queryKey: listQuery.queryKey });
			},
		})
	);

	const hasResumeContent = data.length > 0 || isPending;

	return (
		<section className="space-y-4">
			<section className="flex justify-between gap-4 bg-card px-11 py-7 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Curriculums</h1>

					<FrameDescription>
						Crea y mejora CVs utilizando un agente especialemnte diseñado para los ATS mas comunes
					</FrameDescription>

					<Button className="mt-4 max-w-max" disabled={isPending || data.length >= 5} onClick={() => mutateAsync({})}>
						{isPending ? <Loader centered={false} /> : <PlusCircleIcon />}
						Crear nuevo
					</Button>
				</article>

				<Meter className="max-w-sm" max={5} min={0} value={data.length}>
					<div className="flex justify-between">
						<MeterLabel className="inline-flex items-center gap-1.5">
							<FileMdIcon />
							CVs creados
						</MeterLabel>
						<MeterValue>{(_formatted, value) => `${value} / 5`}</MeterValue>
					</div>

					<MeterTrack>
						<MeterIndicator />
					</MeterTrack>
				</Meter>
			</section>

			<section aria-labelledby="resumes-list-heading" className="px-11 py-2">
				{hasResumeContent ? (
					<article className="flex flex-col gap-4">
						<ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{data.map((resume) => (
								<ResumeCard key={resume.id} resume={resume} />
							))}
							{isPending && <ResumeCardSkeleton />}
						</ul>
					</article>
				) : (
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
								{isPending ? <Loader centered={false} /> : <PlusCircleIcon />}
								Crear CV
							</Button>
						</EmptyContent>
					</Empty>
				)}
			</section>
		</section>
	);
}

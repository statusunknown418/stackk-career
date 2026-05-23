import { FileMdIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteIcon } from "lucide-react";
import { z } from "zod";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ResumeCard, ResumeCardSkeleton } from "@/components/domains/resumes/resume-card";
import { ResumeCreateDialog } from "@/components/domains/resumes/resume-create-dialog";
import { ResumePendingCards } from "@/components/domains/resumes/resume-pending-cards";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const resumesSearchSchema = z.object({
	create: z.literal(1).optional(),
	parserRunId: z.string().optional(),
});

export const Route = createFileRoute("/_protected/dash/resumes/")({
	component: RouteComponent,
	validateSearch: resumesSearchSchema,
	loader: ({ context }) => context.queryClient.ensureQueryData(orpc.resumes.list.queryOptions()),
	pendingComponent: ResumesIndexPending,
});

function ResumesIndexPending() {
	return (
		<section className="space-y-4">
			<section className="flex justify-between gap-4 bg-card px-4 py-6 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Curriculums</h1>
					<FrameDescription>
						Crea y mejora CVs utilizando un agente especialemnte diseñado para los ATS mas comunes
					</FrameDescription>
				</article>
			</section>

			<section className="px-4 py-2">
				<ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<ResumeCardSkeleton key={i.toString()} />
					))}
				</ul>
			</section>
		</section>
	);
}

function RouteComponent() {
	const listQuery = orpc.resumes.list.queryOptions();
	const { data } = useSuspenseQuery(listQuery);
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const { data: session } = authClient.useSession();
	const userId = session?.user?.id;

	const tokenQuery = useQuery({
		...orpc.viewer.realtimeToken.queryOptions(),
		enabled: Boolean(userId),
		staleTime: 29 * 60 * 1000,
	});

	const openDialog = () => navigate({ search: (prev) => ({ ...prev, create: 1 }) });
	const closeDialog = () => navigate({ search: () => ({}) });
	const setParserRunId = (parserRunId: string | undefined) =>
		navigate({ search: (prev) => ({ ...prev, parserRunId, create: 1 }) });

	const hasResumeContent = data.length > 0;

	return (
		<section className="space-y-4">
			<section className="flex justify-between gap-4 bg-card px-4 py-6 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Curriculums</h1>

					<FrameDescription>
						Crea y mejora CVs utilizando un agente especialemnte diseñado para los ATS mas comunes
					</FrameDescription>

					<Button className="mt-4 max-w-max" disabled={data.length >= 5} onClick={openDialog}>
						<PlusCircleIcon />
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

			{userId && tokenQuery.data?.token && (
				<section className="px-4 py-2">
					<ResumePendingCards accessToken={tokenQuery.data.token} userId={userId} />
				</section>
			)}

			<section aria-labelledby="resumes-list-heading" className="px-4 py-2">
				{hasResumeContent ? (
					<article className="flex flex-col gap-4">
						<ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
							{data.map((resume) => (
								<ResumeCard key={resume.id} resume={resume} />
							))}
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
							<Button onClick={openDialog} size="sm">
								<PlusCircleIcon />
								Crear CV
							</Button>
						</EmptyContent>
					</Empty>
				)}
			</section>

			<ResumeCreateDialog
				onClose={closeDialog}
				onParserRunChange={setParserRunId}
				open={search.create === 1}
				parserRunId={search.parserRunId}
			/>
		</section>
	);
}

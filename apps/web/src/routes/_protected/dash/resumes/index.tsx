import { FileMdIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { hasQuotaRemaining, isUnlimited } from "@stackk-career/schemas/subscriptions";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RouteIcon } from "lucide-react";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { UpgradeDialog } from "@/components/domains/billing/upgrade-dialog";
import { ResumeCard, ResumeCardSkeleton } from "@/components/domains/resumes/resume-card";
import { ResumeCreateDialog } from "@/components/domains/resumes/resume-create-dialog";
import { ResumePendingCards } from "@/components/domains/resumes/resume-pending-cards";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/resumes/")({
	component: RouteComponent,
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
				<ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
	const { data: session } = authClient.useSession();
	const userId = session?.user?.id;
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

	const tokenQuery = useQuery({
		...orpc.viewer.realtimeToken.queryOptions(),
		enabled: Boolean(userId),
		staleTime: 29 * 60 * 1000,
	});

	const snapshot = useQuery(orpc.billing.getSnapshot.queryOptions()).data;

	const resumeLimit = snapshot?.entitlements.resumes_total;
	const maxResumes = resumeLimit != null && !isUnlimited(resumeLimit) ? resumeLimit : data.length;

	// Manual creation is bounded only by the all-time CV total. The per-cycle AI quota
	// (`resume_creation_generations_per_cycle`) gates the PDF-upload path inside the dialog, not this entry.
	const canCreateResume =
		snapshot == null || hasQuotaRemaining(snapshot.entitlements.resumes_total, snapshot.usage.resumes_total);

	const handleCreate = () => {
		if (canCreateResume) {
			setIsCreateDialogOpen(true);
		} else {
			setIsUpgradeOpen(true);
		}
	};

	const hasResumeContent = data.length > 0;

	return (
		<section className="space-y-4">
			<section className="flex justify-between gap-4 bg-card px-4 py-6 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Curriculums</h1>

					<FrameDescription>
						Crea y mejora CVs utilizando un agente especialemnte diseñado para los ATS mas comunes
					</FrameDescription>

					<Button className="mt-4 max-w-max" onClick={handleCreate}>
						<PlusCircleIcon />
						Crear nuevo
					</Button>
				</article>

				<Meter className="max-w-sm" max={maxResumes} min={0} value={data.length}>
					<div className="flex justify-between">
						<MeterLabel className="inline-flex items-center gap-1.5">
							<FileMdIcon />
							CVs creados
						</MeterLabel>
						<MeterValue>{(_formatted, value) => `${value} / ${maxResumes}`}</MeterValue>
					</div>

					<MeterTrack className="rounded-lg">
						<MeterIndicator />
					</MeterTrack>
				</Meter>
			</section>

			{userId && tokenQuery.data?.token && <ResumePendingCards accessToken={tokenQuery.data.token} userId={userId} />}

			<section aria-labelledby="resumes-list-heading" className="px-4 py-2">
				{hasResumeContent ? (
					<article className="flex flex-col gap-4">
						<ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
							<Button onClick={handleCreate} size="sm">
								<PlusCircleIcon />
								Crear CV
							</Button>
						</EmptyContent>
					</Empty>
				)}
			</section>

			<ResumeCreateDialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen} />
			<UpgradeDialog
				description={`Tu plan incluye hasta ${maxResumes} CVs. Mejora a Pro o Max para crear más.`}
				onOpenChange={setIsUpgradeOpen}
				open={isUpgradeOpen}
				title="Alcanzaste el límite de CVs"
			/>
		</section>
	);
}

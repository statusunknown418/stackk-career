import { ArrowsClockwiseIcon, CalendarBlankIcon, SparkleIcon } from "@phosphor-icons/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";
import { SuggestedEmpty, SuggestedFailed, SuggestedPending } from "./suggested-empty";
import { SuggestedJobCard, SuggestedJobCardSkeleton } from "./suggested-job-card";

/** The `suggestedJobs.list` payload — the module that owns the value is the API router. */
type SuggestedJobsList = AppRouterOutputs["suggestedJobs"]["list"];

/** Feed grid — one column on phones, two on larger screens (the richer cards need the width). */
const GRID_CLASS = "grid list-none gap-4 md:grid-cols-2";
/** Stable keys for the fixed-length skeleton grid (no array-index keys). */
const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

export function SuggestedListSkeleton() {
	return (
		<section className="px-4 py-2">
			<ul className={GRID_CLASS}>
				{SKELETON_KEYS.map((key) => (
					<SuggestedJobCardSkeleton key={key} />
				))}
			</ul>
		</section>
	);
}

function SuggestedBody({
	data,
	onDismiss,
	dismissingId,
}: {
	data: SuggestedJobsList;
	onDismiss: (id: string) => void;
	dismissingId: string | undefined;
}) {
	if (data.jobs.length > 0) {
		return (
			<ul className={GRID_CLASS}>
				{data.jobs.map((job) => (
					<SuggestedJobCard isDismissing={dismissingId === job.id} job={job} key={job.id} onDismiss={onDismiss} />
				))}
			</ul>
		);
	}

	if (data.run?.status === "pending" || data.run?.status === "running") {
		return <SuggestedPending />;
	}

	if (data.run?.status === "failed") {
		return <SuggestedFailed nextRefreshAt={data.nextRefreshAt} />;
	}

	return <SuggestedEmpty />;
}

export function SuggestedList() {
	const queryClient = useQueryClient();
	const listQueryKey = orpc.suggestedJobs.list.queryKey();
	const { data } = useSuspenseQuery(orpc.suggestedJobs.list.queryOptions());

	const dismiss = useMutation(
		orpc.suggestedJobs.dismiss.mutationOptions({
			onMutate: async ({ id }) => {
				await queryClient.cancelQueries({ queryKey: listQueryKey });
				const previous = queryClient.getQueryData<SuggestedJobsList>(listQueryKey);
				queryClient.setQueryData<SuggestedJobsList>(listQueryKey, (prev) =>
					prev ? { ...prev, jobs: prev.jobs.filter((job) => job.id !== id) } : prev
				);
				return { previous };
			},
			onError: (mutationError, _variables, context) => {
				if (context?.previous) {
					queryClient.setQueryData<SuggestedJobsList>(listQueryKey, context.previous);
				}
				toast.error(mutationError.message || "No se pudo descartar esta vacante.");
			},
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: listQueryKey });
			},
		})
	);

	const refresh = useMutation(
		orpc.suggestedJobs.refreshNow.mutationOptions({
			onSuccess: () => {
				toast.success("Buscando nuevas vacantes…");
				queryClient.invalidateQueries({ queryKey: listQueryKey });
			},
			onError: (mutationError) => {
				toast.error(mutationError.message || "No pudimos actualizar ahora.");
			},
		})
	);

	const isFree = data.cadence === "monthly";
	const isRunning = data.run?.status === "pending" || data.run?.status === "running";
	// Free plans may refresh only when their monthly run is due; paid always can (server holds a 1h cooldown).
	const isDue = !data.nextRefreshAt || data.nextRefreshAt.getTime() <= Date.now();
	const canRefresh = !isFree || isDue;

	return (
		<section className="space-y-4 px-4 py-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					{data.nextRefreshAt && !isDue && (
						<span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
							<CalendarBlankIcon />
							Próxima actualización: {format(data.nextRefreshAt, "d 'de' MMMM", { locale: es })}
						</span>
					)}

					{isFree && (
						<Badge size="sm" variant="secondary">
							<SparkleIcon />
							Actualización diaria con Pro o Max
						</Badge>
					)}
				</div>

				<Button
					disabled={isRunning || !canRefresh}
					loading={refresh.isPending}
					onClick={() => refresh.mutate(undefined)}
					size="sm"
					variant="secondary"
				>
					<ArrowsClockwiseIcon className={isRunning ? "animate-spin" : undefined} />
					Actualizar ahora
				</Button>
			</div>

			<SuggestedBody
				data={data}
				dismissingId={dismiss.isPending ? dismiss.variables?.id : undefined}
				onDismiss={(id) => dismiss.mutate({ id })}
			/>
		</section>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { SuggestedList, SuggestedListSkeleton } from "@/components/domains/suggested/suggested-list";
import { FrameDescription } from "@/components/ui/frame";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/suggested")({
	component: RouteComponent,
	loader: ({ context }) =>
		Promise.allSettled([context.queryClient.ensureQueryData(orpc.suggestedJobs.list.queryOptions())]),
	pendingComponent: PendingRoute,
});

function SuggestedHeader() {
	return (
		<header className="px-4 py-6">
			<h1 className="font-light text-2xl">Puestos recomendados</h1>
			<FrameDescription>Vacantes recomendadas según tu perfil y CV principal.</FrameDescription>
		</header>
	);
}

function RouteComponent() {
	return (
		<section className="space-y-4">
			<SuggestedHeader />
			<SuggestedList />
		</section>
	);
}

function PendingRoute() {
	return (
		<section className="space-y-4">
			<SuggestedHeader />
			<SuggestedListSkeleton />
		</section>
	);
}

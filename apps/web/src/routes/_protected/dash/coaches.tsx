import { createFileRoute } from "@tanstack/react-router";
import { CoachingTimeline } from "@/components/domains/coaching/coaching-timeline";
import { FrameDescription } from "@/components/ui/frame";

export const Route = createFileRoute("/_protected/dash/coaches")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<section className="flex flex-col gap-4 px-4 py-6">
			<header>
				<h1 className="font-light text-2xl">Agenda tu asesoría</h1>
				<FrameDescription>
					Las asesorías son confidenciales entre el coach y tú. Nunca venderemos tus datos.
				</FrameDescription>
			</header>

			<CoachingTimeline />
		</section>
	);
}

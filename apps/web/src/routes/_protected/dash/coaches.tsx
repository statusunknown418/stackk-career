import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { FeatureGate } from "@/components/domains/billing/feature-gate";
import { CoachingTimeline } from "@/components/domains/coaching/coaching-timeline";
import { FrameDescription } from "@/components/ui/frame";

const coachesSearchSchema = z.object({
	step: z.coerce.number().int().min(1).max(4).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/dash/coaches")({
	component: RouteComponent,
	validateSearch: coachesSearchSchema,
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

			<FeatureGate limitKey="coaching_sessions_per_cycle">
				<CoachingTimeline />
			</FeatureGate>
		</section>
	);
}

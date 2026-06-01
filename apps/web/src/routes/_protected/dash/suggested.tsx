import { createFileRoute } from "@tanstack/react-router";
import { FeatureGate } from "@/components/domains/billing/feature-gate";
import { ComingSoon } from "@/components/domains/dashboard/coming-soon";
import { FrameDescription } from "@/components/ui/frame";

export const Route = createFileRoute("/_protected/dash/suggested")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<section className="flex flex-col gap-4 px-4 py-6">
			<header>
				<h1 className="font-light text-2xl">Targets</h1>
				<FrameDescription>Descubre vacantes recomendadas según tu perfil.</FrameDescription>
			</header>

			<FeatureGate placeholder requiresPaid>
				<ComingSoon description="Pronto verás vacantes recomendadas aquí." />
			</FeatureGate>
		</section>
	);
}

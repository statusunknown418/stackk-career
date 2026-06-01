import { createFileRoute } from "@tanstack/react-router";
import { FeatureGate } from "@/components/domains/billing/feature-gate";
import { ComingSoon } from "@/components/domains/dashboard/coming-soon";
import { FrameDescription } from "@/components/ui/frame";

export const Route = createFileRoute("/_protected/dash/letters")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<section className="flex flex-col gap-4 px-4 py-6">
			<header>
				<h1 className="font-light text-2xl">Cartas de presentación</h1>
				<FrameDescription>Genera cartas de presentación a la medida de cada vacante.</FrameDescription>
			</header>

			<FeatureGate placeholder requiresPaid>
				<ComingSoon description="Pronto podrás crear cartas de presentación aquí." />
			</FeatureGate>
		</section>
	);
}

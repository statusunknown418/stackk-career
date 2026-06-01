import { createFileRoute } from "@tanstack/react-router";
import { FeatureGate } from "@/components/domains/billing/feature-gate";
import { ComingSoon } from "@/components/domains/dashboard/coming-soon";
import { FrameDescription } from "@/components/ui/frame";

export const Route = createFileRoute("/_protected/dash/agents")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<section className="flex flex-col gap-4 px-4 py-6">
			<header>
				<h1 className="font-light text-2xl">Agentes</h1>
				<FrameDescription>Conversa con agentes de IA que potencian tu búsqueda laboral.</FrameDescription>
			</header>

			<FeatureGate limitKey="conversation_generations_per_cycle" placeholder>
				<ComingSoon description="Pronto podrás conversar con tus agentes desde aquí." />
			</FeatureGate>
		</section>
	);
}

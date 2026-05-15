import { createFileRoute } from "@tanstack/react-router";
import { DashboardAiActivity } from "@/components/domains/dashboard/ai-activity";
import { DashboardCoaching } from "@/components/domains/dashboard/coaching";
import { DashboardGreeting } from "@/components/domains/dashboard/greeting";
import { DashboardStats } from "@/components/domains/dashboard/stats";

export const Route = createFileRoute("/_protected/dash/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
			<DashboardGreeting />
			<DashboardStats />
			{/*<DashboardPipeline />*/}

			<section className="grid gap-4 lg:grid-cols-2">
				<DashboardAiActivity />
				<DashboardCoaching />
			</section>
		</main>
	);
}

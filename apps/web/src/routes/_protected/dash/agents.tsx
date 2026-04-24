import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dash/agents")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_protected/dash/agents"!</div>;
}

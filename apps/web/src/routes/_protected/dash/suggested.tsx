import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dash/suggested")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_protected/dash/suggested"!</div>;
}

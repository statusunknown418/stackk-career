import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dash/resumes")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_protected/dash/resumes"!</div>;
}

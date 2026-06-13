import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dash/")({
	component: RouteComponent,
});

function RouteComponent() {
	return redirect({
		to: "/dash/resumes",
	});
}

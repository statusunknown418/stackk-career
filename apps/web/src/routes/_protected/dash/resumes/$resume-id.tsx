import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dash/resumes/$resume-id")({
	component: RouteComponent,
});

function RouteComponent() {
	const params = Route.useParams();

	return <section>Hello {params.resumeId}!</section>;
}

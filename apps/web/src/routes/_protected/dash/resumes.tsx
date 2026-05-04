import { FileCodeIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/resumes")({
	component: RouteComponent,
	beforeLoad: async () => queryClient.ensureQueryData(orpc.resumes.list.queryOptions()),
});

function RouteComponent() {
	const { data } = useSuspenseQuery(orpc.resumes.list.queryOptions());

	return (
		<section>
			<article className="grid gap-2 bg-muted px-4 py-5">
				<h1 className="font-light text-xl">CVs - Curriculums</h1>
				<p className="flex items-center gap-1 text-muted-foreground text-sm">
					<FileCodeIcon />
					{data.length}/5 resumes
				</p>
			</article>
		</section>
	);
}

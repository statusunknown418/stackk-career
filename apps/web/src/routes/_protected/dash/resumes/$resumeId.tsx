import { CopyIcon, ExportIcon, ListIcon, PencilIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatDate } from "date-fns";
import { NewSectionSheet } from "@/components/domains/resume-editor/new-section-sheet";
import { ResumeDocument } from "@/components/domains/resume-editor/resume-document";
import { Button } from "@/components/ui/button";
import { Group, GroupSeparator } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/menu";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/resumes/$resumeId")({
	component: RouteComponent,
	loader: ({ params }) =>
		queryClient.ensureQueryData(
			orpc.resumes.get.queryOptions({
				input: { id: params.resumeId },
			})
		),
});

function RouteComponent() {
	const params = Route.useParams();
	const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));

	return (
		<section className="flex flex-col gap-8">
			<header className="flex flex-col items-start gap-4 border-b px-8 py-6 md:flex-row md:justify-between">
				<article>
					<p className="pl-3 text-muted-foreground text-sm">
						<span>{formatDate(data.createdAt, "PP")}</span>
						{" - "}
						<span>{formatDate(data.createdAt, "HH:mm")}</span>
					</p>

					<InputGroup className="px-0" variant="ghost">
						<Input className="text-lg!" defaultValue={data.title} variant="ghost" />

						<InputGroupAddon align="inline-end">
							<Button size="icon-sm" variant="ghost">
								<PencilIcon />
							</Button>
						</InputGroupAddon>
					</InputGroup>
				</article>

				<article className="flex items-center gap-2">
					<Group>
						<NewSectionSheet />

						<GroupSeparator />

						<DropdownMenu>
							<Button render={<DropdownMenuTrigger />} size="icon" variant="outline">
								<ListIcon />
							</Button>

							<DropdownMenuContent align="start">
								<DropdownMenuItem>
									<ExportIcon />
									Exportar
								</DropdownMenuItem>

								<DropdownMenuItem>
									<CopyIcon />
									Clonar
								</DropdownMenuItem>

								<DropdownMenuSeparator />

								<DropdownMenuItem variant="destructive">
									<TrashSimpleIcon />
									Borrar
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</Group>
				</article>
			</header>

			<ResumeDocument blocks={data.blocks} />
		</section>
	);
}

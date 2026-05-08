import { CopyIcon, ExportIcon, ListIcon, PencilIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDate } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { ResumeDocumentContactHeader } from "@/components/domains/documents/contact-header";
import { ResumeDocumentEmptyState } from "@/components/domains/documents/document-empty-state";
import { ResumeDocumentSection } from "@/components/domains/documents/document-section";
import { NewSectionSheet } from "@/components/domains/resume-editor/new-section-sheet";
import Loader from "@/components/loader";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	const navigate = useNavigate();
	const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const rootBlocks = buildBlockTree(data.blocks);
	const contactBlock = rootBlocks.find((block) => block.blockType === "contact") ?? null;
	const sectionBlocks = rootBlocks.filter((block) => block.blockType === "section");

	const deleteMutation = useMutation(
		orpc.resumes.delete.mutationOptions({
			onSuccess: async () => {
				toast.success("CV borrado");
				setIsDeleteOpen(false);
				await queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryOptions().queryKey });
				navigate({ to: "/dash/resumes" });
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo borrar el CV");
			},
		})
	);

	const handleDelete = async () => {
		await deleteMutation.mutateAsync({ id: params.resumeId });
	};

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

								<DropdownMenuItem
									onClick={(event) => {
										event.preventDefault();
										setIsDeleteOpen(true);
									}}
									variant="destructive"
								>
									<TrashSimpleIcon />
									Borrar
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</Group>
				</article>
			</header>

			<section className="flex w-full max-w-4xl flex-col gap-8 px-11">
				{contactBlock && <ResumeDocumentContactHeader block={contactBlock} />}

				<article>
					{!!sectionBlocks.length &&
						sectionBlocks.map((block, index) => (
							<ResumeDocumentSection block={block} isLast={index === sectionBlocks.length - 1} key={block.id} />
						))}
				</article>

				{!sectionBlocks.length && <ResumeDocumentEmptyState message="Este CV todavía no tiene secciones." />}
			</section>

			<AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
				<AlertDialogPopup>
					<AlertDialogHeader>
						<AlertDialogTitle>Borrar este CV</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Se eliminará el CV junto con todas sus secciones.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<Button disabled={deleteMutation.isPending} render={<AlertDialogClose />} variant="outline">
							Cancelar
						</Button>
						<Button disabled={deleteMutation.isPending} onClick={handleDelete} variant="destructive">
							{deleteMutation.isPending ? <Loader /> : <TrashSimpleIcon />}
							Borrar
						</Button>
					</AlertDialogFooter>
				</AlertDialogPopup>
			</AlertDialog>
		</section>
	);
}

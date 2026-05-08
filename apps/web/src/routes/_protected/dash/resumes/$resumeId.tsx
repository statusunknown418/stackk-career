import { CopyIcon, ExportIcon, ListIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { type ResumeDocumentWrapperForm, resumeDocumentWrapperFormSchema } from "@stackk-career/schemas/api/resumes";
import { buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDate } from "date-fns";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { NewSectionSheet } from "@/components/domains/resume-editor/new-section-sheet";
import { ResumeDocumentEditor } from "@/components/domains/resume-editor/resume-document-editor";
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
import { InputGroup } from "@/components/ui/input-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/menu";
import { orpc, queryClient } from "@/utils/orpc";

type SaveStatus = "error" | "idle" | "saved" | "saving";

const buildDocumentFormValues = (data: { blocks: unknown[]; id: string; title: string }): ResumeDocumentWrapperForm =>
	resumeDocumentWrapperFormSchema.parse({
		id: data.id,
		title: data.title,
		blocks: data.blocks,
	});

const replaceBlockById = (
	blocks: ResumeDocumentWrapperForm["blocks"],
	nextBlock: ResumeDocumentWrapperForm["blocks"][number]
) => blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block));

const updateListResumeTitle = (resumeId: string, title: string, updatedAt: Date) => {
	const listQuery = orpc.resumes.list.queryOptions();

	queryClient.setQueryData(
		listQuery.queryKey,
		(previous) =>
			previous?.map((resume) => (resume.id === resumeId ? { ...resume, title, updatedAt } : resume)) ?? previous
	);
};

const buildHydrationKey = (data: {
	blocks: { id: number; updatedAt: Date }[];
	id: string;
	title: string;
	updatedAt: Date;
}) =>
	[
		data.id,
		data.title,
		new Date(data.updatedAt).getTime(),
		...data.blocks.map((block) => `${block.id}:${new Date(block.updatedAt).getTime()}`),
	].join("|");

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
	const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: params.resumeId } });
	const { data } = useSuspenseQuery(resumeQuery);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const pendingSavesRef = useRef(0);
	const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const blockSaveTimeoutsRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
	const form = useForm({
		defaultValues: buildDocumentFormValues(data),
	});
	const formValues = useStore(form.store, (state) => state.values);
	const rootBlocks = buildBlockTree(formValues.blocks);
	const blockIndexById = new Map(formValues.blocks.map((block, index) => [block.id, index] as const));
	const lastSavedRef = useRef<ResumeDocumentWrapperForm>(buildDocumentFormValues(data));
	const hydratedDataKeyRef = useRef(buildHydrationKey(data));
	const nextHydrationKey = buildHydrationKey(data);

	if (hydratedDataKeyRef.current !== nextHydrationKey) {
		const nextValues = buildDocumentFormValues(data);

		hydratedDataKeyRef.current = nextHydrationKey;
		lastSavedRef.current = nextValues;
		form.reset(nextValues);
	}

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
	const titleMutation = useMutation(orpc.resumes.updateTitle.mutationOptions());
	const blockMutation = useMutation(orpc.blocks.update.mutationOptions());

	const beginSave = () => {
		if (saveStatusTimeoutRef.current) {
			clearTimeout(saveStatusTimeoutRef.current);
			saveStatusTimeoutRef.current = null;
		}

		pendingSavesRef.current += 1;
		setSaveStatus("saving");
	};

	const finishSave = (status: Exclude<SaveStatus, "saving">) => {
		pendingSavesRef.current = Math.max(0, pendingSavesRef.current - 1);

		if (status === "error") {
			setSaveStatus("error");
			return;
		}

		if (pendingSavesRef.current > 0) {
			return;
		}

		setSaveStatus("saved");
		saveStatusTimeoutRef.current = setTimeout(() => {
			setSaveStatus("idle");
		}, 1600);
	};

	const saveTitle = async () => {
		const nextTitle = form.state.values.title.trim();
		const previousTitle = lastSavedRef.current.title.trim();

		if (!nextTitle || nextTitle === previousTitle) {
			if (nextTitle !== form.state.values.title) {
				form.setFieldValue("title", nextTitle);
			}

			return;
		}

		form.setFieldValue("title", nextTitle);
		beginSave();

		try {
			const updatedResume = await titleMutation.mutateAsync({
				id: params.resumeId,
				title: nextTitle,
			});

			lastSavedRef.current = {
				...lastSavedRef.current,
				title: updatedResume.title,
			};

			queryClient.setQueryData(resumeQuery.queryKey, (previous) =>
				previous ? { ...previous, title: updatedResume.title, updatedAt: updatedResume.updatedAt } : previous
			);
			updateListResumeTitle(updatedResume.id, updatedResume.title, updatedResume.updatedAt);
			finishSave("saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo guardar el título");
			finishSave("error");
		}
	};

	const saveBlock = async (blockId: number) => {
		const blockIndex = form.state.values.blocks.findIndex((block) => block.id === blockId);
		const lastSavedIndex = lastSavedRef.current.blocks.findIndex((block) => block.id === blockId);

		if (blockIndex < 0 || lastSavedIndex < 0) {
			return;
		}

		const currentBlock = form.state.values.blocks[blockIndex];
		const previousBlock = lastSavedRef.current.blocks[lastSavedIndex];

		if (
			!(currentBlock && previousBlock) ||
			JSON.stringify(currentBlock.content) === JSON.stringify(previousBlock.content)
		) {
			return;
		}

		beginSave();

		try {
			const updatedBlock = await blockMutation.mutateAsync({
				id: currentBlock.id,
				resumeId: params.resumeId,
				blockType: currentBlock.blockType,
				content: currentBlock.content,
			} as never);

			form.setFieldValue(`blocks[${blockIndex}]` as never, updatedBlock as never);
			lastSavedRef.current = {
				...lastSavedRef.current,
				blocks: replaceBlockById(lastSavedRef.current.blocks, updatedBlock),
			};

			queryClient.setQueryData(resumeQuery.queryKey, (previous) =>
				previous
					? {
							...previous,
							blocks: replaceBlockById(previous.blocks as ResumeDocumentWrapperForm["blocks"], updatedBlock),
						}
					: previous
			);
			finishSave("saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo guardar bloque");
			finishSave("error");
		}
	};

	const queueBlockSave = (blockId: number) => {
		const previousTimeout = blockSaveTimeoutsRef.current.get(blockId);

		if (previousTimeout) {
			clearTimeout(previousTimeout);
		}

		const timeout = setTimeout(() => {
			blockSaveTimeoutsRef.current.delete(blockId);
			void saveBlock(blockId);
		}, 800);

		blockSaveTimeoutsRef.current.set(blockId, timeout);
	};

	const flushBlockSave = (blockId: number) => {
		const timeout = blockSaveTimeoutsRef.current.get(blockId);

		if (timeout) {
			clearTimeout(timeout);
			blockSaveTimeoutsRef.current.delete(blockId);
		}

		void saveBlock(blockId);
	};

	const handleDelete = async () => {
		await deleteMutation.mutateAsync({ id: params.resumeId });
	};

	const saveStatusLabel =
		saveStatus === "saving" ? "Saving" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : null;

	return (
		<section className="flex flex-col gap-8">
			<header className="flex flex-col items-start gap-4 border-b px-8 py-6 md:flex-row md:justify-between">
				<article className="w-full max-w-xl">
					<div className="flex items-center gap-3 pl-3">
						<p className="text-muted-foreground text-sm">
							<span>{formatDate(data.createdAt, "PP")}</span>
							{" - "}
							<span>{formatDate(data.createdAt, "HH:mm")}</span>
						</p>
						{saveStatusLabel ? (
							<span className={saveStatus === "error" ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
								{saveStatusLabel}
							</span>
						) : null}
					</div>

					<InputGroup className="px-0" variant="ghost">
						<Input
							className="text-lg!"
							nativeInput
							onBlur={() => {
								saveTitle();
							}}
							onChange={(event) => {
								form.setFieldValue("title", event.currentTarget.value);
							}}
							value={formValues.title}
							variant="ghost"
						/>
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

			<ResumeDocumentEditor
				blockIndexById={blockIndexById}
				onBlockBlur={(blockId) => {
					flushBlockSave(blockId);
				}}
				onFieldChange={(path, value) => {
					form.setFieldValue(path as never, value as never);
				}}
				onRichTextBlur={(blockId) => {
					flushBlockSave(blockId);
				}}
				onRichTextChange={({ blockId, formatPath, formatValue, path, value }) => {
					form.setFieldValue(path as never, value as never);
					form.setFieldValue(formatPath as never, formatValue as never);
					queueBlockSave(blockId);
				}}
				rootBlocks={rootBlocks}
			/>

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

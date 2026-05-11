import { CopyIcon, ExportIcon, ListIcon, SparkleIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { type ResumeDocumentWrapperForm, resumeDocumentWrapperFormSchema } from "@stackk-career/schemas/api/resumes";
import { type Block, buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { useStore } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDate } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NewSectionSheet } from "@/components/domains/resume-editor/new-section-sheet";
import { ResumeDocumentEditor } from "@/components/domains/resume-editor/resume-document-editor";
import {
	type ResumeAutosave,
	type SaveStatus,
	useResumeAutosave,
} from "@/components/domains/resume-editor/use-resume-autosave";
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
import { type ResumeFormApi, useAppForm } from "@/lib/forms/resume-form";
import { orpc, queryClient } from "@/utils/orpc";

const SAVE_STATUS_LABELS: Record<SaveStatus, string | null> = {
	error: "Error",
	idle: null,
	saved: "Saved",
	saving: "Saving",
};

const buildDocumentFormValues = (data: { blocks: unknown[]; id: string; title: string }): ResumeDocumentWrapperForm =>
	resumeDocumentWrapperFormSchema.parse({
		id: data.id,
		title: data.title,
		blocks: data.blocks,
	});

// Hydration key is intentionally shape-only (id + parent + position). Content
// updates (title, block content, updatedAt) flow into the cache via our own
// mutations and must NOT trigger a `form.reset` — that would clobber any
// keystrokes that arrived between request dispatch and response. Add/remove/
// reorder operations DO change the shape and rightly cause a reset so the form
// picks up the new field paths.
const buildHydrationKey = (data: {
	blocks: { id: number; parentBlockId: number | null; position: string }[];
	id: string;
}) => [data.id, ...data.blocks.map((block) => `${block.id}:${block.parentBlockId ?? ""}:${block.position}`)].join("|");

const BLOCK_FIELD_PATH_RE = /^blocks\[(\d+)\]/;

type FormBlock = ResumeDocumentWrapperForm["blocks"][number];

const removeMissingBlocks = async (form: ResumeFormApi, keepIds: Set<number>) => {
	const formBlocks = form.state.values.blocks;
	for (let index = formBlocks.length - 1; index >= 0; index--) {
		const formBlock = formBlocks[index];
		if (formBlock && !keepIds.has(formBlock.id)) {
			await form.removeFieldValue("blocks", index);
		}
	}
};

const patchSurvivorBlockMetadata = (form: ResumeFormApi, nextById: Map<number, FormBlock>): Set<number> => {
	const survivors = form.state.values.blocks;
	const survivorIds = new Set<number>();
	for (let index = 0; index < survivors.length; index++) {
		const formBlock = survivors[index];
		if (!formBlock) {
			continue;
		}
		survivorIds.add(formBlock.id);
		const next = nextById.get(formBlock.id);
		if (!next) {
			continue;
		}
		if (next.position !== formBlock.position) {
			form.setFieldValue(`blocks[${index}].position`, next.position);
		}
		if ((next.parentBlockId ?? null) !== (formBlock.parentBlockId ?? null)) {
			form.setFieldValue(`blocks[${index}].parentBlockId`, next.parentBlockId);
		}
		if ((next as Block).updatedAt !== formBlock.updatedAt) {
			form.setFieldValue(`blocks[${index}].updatedAt`, next.updatedAt);
		}
	}
	return survivorIds;
};

const reconcileBlocks = async (form: ResumeFormApi, nextBlocks: FormBlock[]) => {
	const nextById = new Map<number, FormBlock>(nextBlocks.map((block) => [block.id, block]));
	const keepIds = new Set<number>(nextBlocks.map((block) => block.id));
	await removeMissingBlocks(form, keepIds);
	const survivorIds = patchSurvivorBlockMetadata(form, nextById);
	for (const next of nextBlocks) {
		if (!survivorIds.has(next.id)) {
			form.pushFieldValue("blocks", next);
		}
	}
};

const blockIdFromFieldName = (name: string, values: ResumeDocumentWrapperForm): number | null => {
	const match = BLOCK_FIELD_PATH_RE.exec(name);
	if (!match) {
		return null;
	}
	const block = values.blocks[Number(match[1])];
	return block?.id ?? null;
};

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

	const initialValues = useMemo(() => buildDocumentFormValues(data), [data]);

	// Form-level listeners are the single source of autosave dispatch. They read
	// the (always-current) autosaveRef and derive the target blockId from the
	// fired field's path, which keeps editors free of per-field listener wiring.
	const autosaveRef = useRef<ResumeAutosave | null>(null);

	const form = useAppForm({
		defaultValues: initialValues,
		listeners: {
			onChange: ({ fieldApi, formApi }) => {
				const autosave = autosaveRef.current;
				if (!autosave || fieldApi.name === "title") {
					return;
				}
				const blockId = blockIdFromFieldName(fieldApi.name, formApi.state.values);
				if (blockId !== null) {
					autosave.queueBlockSave(blockId);
				}
			},
			onBlur: ({ fieldApi, formApi }) => {
				const autosave = autosaveRef.current;
				if (!autosave) {
					return;
				}
				if (fieldApi.name === "title") {
					autosave.saveTitle();
					return;
				}
				const blockId = blockIdFromFieldName(fieldApi.name, formApi.state.values);
				if (blockId !== null) {
					autosave.flushBlockSave(blockId);
				}
			},
		},
	});

	const autosave = useResumeAutosave({
		getValues: () => form.state.values,
		initialValues,
		resumeId: params.resumeId,
		setTitle: (title) => form.setFieldValue("title", title),
	});
	autosaveRef.current = autosave;

	// Re-hydrate the form when the underlying resume snapshot changes (e.g. after
	// adding a section, deleting blocks, or any external mutation that invalidates
	// the query). Tree shape is keyed by id + updatedAt of every block + the resume
	// itself, so per-keystroke saves don't trigger a reset.
	const hydratedDataKeyRef = useRef<string | null>(null);
	const nextHydrationKey = buildHydrationKey(data);

	useEffect(() => {
		if (hydratedDataKeyRef.current === nextHydrationKey) {
			return;
		}
		const isFirstHydration = hydratedDataKeyRef.current === null;
		hydratedDataKeyRef.current = nextHydrationKey;

		if (isFirstHydration) {
			return;
		}
		const nextValues = buildDocumentFormValues(data);
		autosave.hydrateSaved(nextValues);

		// Reconcile surgically: preserve any keystrokes in matching blocks; add new
		// blocks; remove blocks that no longer exist; patch metadata (position,
		// parentBlockId) when it changes. A blanket `form.reset` here would wipe
		// any in-progress edits whenever a sibling block is added or deleted.
		reconcileBlocks(form, nextValues.blocks).catch(() => undefined);
	}, [nextHydrationKey, data, form, autosave]);

	// Subscribe only to a tree-shape projection so the route re-renders when blocks
	// are added/removed/reordered, but not on every keystroke. Field components
	// subscribe to their own values via TanStack Form's field context. The tree
	// and index map are recomputed on each (rare) re-render rather than memoized,
	// which keeps the dependency list honest without paying for a useMemo guard.
	useStore(form.store, (state) =>
		state.values.blocks.map((block) => `${block.id}:${block.parentBlockId ?? ""}:${block.position}`).join("|")
	);
	const rootBlocks = buildBlockTree(form.state.values.blocks);
	const blockIndexById = new Map(form.state.values.blocks.map((block, index) => [block.id, index] as const));

	const deleteMutation = useMutation(
		orpc.resumes.delete.mutationOptions({
			onError: (error) => {
				toast.error(error.message || "No se pudo borrar el CV");
			},
			onSuccess: async () => {
				toast.success("CV borrado");
				setIsDeleteOpen(false);
				await queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryOptions().queryKey });
				navigate({ to: "/dash/resumes" });
			},
		})
	);

	const handleDelete = async () => {
		await deleteMutation.mutateAsync({ id: params.resumeId });
	};

	const saveStatusLabel = SAVE_STATUS_LABELS[autosave.saveStatus];

	return (
		<section className="relative flex flex-col gap-8">
			<header className="sticky inset-0 z-10 flex flex-col items-start gap-4 border-b bg-background/80 px-8 py-6 backdrop-blur-md md:flex-row md:justify-between">
				<article className="w-full max-w-xl">
					<div className="flex items-center gap-3 pl-3">
						<p className="text-muted-foreground text-sm">
							<span>{formatDate(data.createdAt, "PP")}</span>
							{" - "}
							<span>{formatDate(data.createdAt, "HH:mm")}</span>
						</p>

						{saveStatusLabel && (
							<span
								className={
									autosave.saveStatus === "error" ? "text-destructive text-xs" : "text-muted-foreground text-xs"
								}
							>
								{saveStatusLabel}
							</span>
						)}
					</div>

					<form.AppField name="title">
						{(field) => (
							<InputGroup className="px-0" variant="ghost">
								<Input
									className="text-lg!"
									nativeInput
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(event.currentTarget.value);
									}}
									value={field.state.value}
									variant="ghost"
								/>
							</InputGroup>
						)}
					</form.AppField>
				</article>

				<article className="flex items-center gap-2">
					<Group>
						<Button>
							<SparkleIcon />
							Casey
						</Button>

						<NewSectionSheet form={form} />

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

			<ResumeDocumentEditor blockIndexById={blockIndexById} form={form} rootBlocks={rootBlocks} />

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

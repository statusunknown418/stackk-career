import { CaretDownIcon, CopyIcon, ExportIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import type { ResumeEdit } from "@stackk-career/schemas/ai/resume-analysis";
import { getSectionKind } from "@stackk-career/schemas/api/resumes";
import { type Block, buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { useStore } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDate } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { InlineTextEditor } from "@/components/domains/resume-document/inline-text-editor";
import { ResumeDocument } from "@/components/domains/resume-document/resume-document";
import { NewSectionSheet } from "@/components/domains/resume-editor/new-section-sheet";
import { ResumeAnalysisSection } from "@/components/domains/resume-editor/resume-analysis-section";
import { SectionRail, type SectionRailItem } from "@/components/domains/resume-editor/section-rail";
import { useDeleteBlock } from "@/components/domains/resume-editor/use-block-mutations";
import { type ResumeAutosave, useResumeAutosave } from "@/components/domains/resume-editor/use-resume-autosave";
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
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Group, GroupSeparator } from "@/components/ui/group";
import { Skeleton } from "@/components/ui/skeleton";
import {
	blockIdFromFieldName,
	buildDocumentFormValues,
	buildHydrationKey,
	reconcileBlocks,
	SAVE_STATUS_LABELS,
	useAppForm,
} from "@/lib/forms/resume-form";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

const swapText = (value: string | undefined, before: string, after: string): string | null => {
	if (!value?.includes(before)) {
		return null;
	}
	return value.replace(before, after);
};

const applyRewriteToBlock = (block: Block, before: string, after: string): Block["content"] | null => {
	switch (block.blockType) {
		case "bullet":
		case "paragraph": {
			const next = swapText(block.content.text, before, after);
			return next === null ? null : { ...block.content, text: next };
		}
		case "entry": {
			const hit = (["descriptor", "title", "subtitle", "location"] as const)
				.map((key) => ({ key, next: swapText(block.content[key], before, after) }))
				.find((candidate) => candidate.next !== null);
			return hit ? { ...block.content, [hit.key]: hit.next } : null;
		}
		case "section": {
			const next = swapText(block.content.title, before, after);
			return next === null ? null : { ...block.content, title: next };
		}
		case "skill_item": {
			const next = swapText(block.content.value, before, after);
			return next === null ? null : { ...block.content, value: next };
		}
		case "skill_line": {
			const next = swapText(block.content.label, before, after);
			return next === null ? null : { ...block.content, label: next };
		}
		case "contact": {
			const idx = block.content.items.findIndex((item) => item.value.includes(before));
			if (idx === -1) {
				return null;
			}
			const item = block.content.items[idx];
			if (!item) {
				return null;
			}
			const items = [...block.content.items];
			items[idx] = { ...item, value: item.value.replace(before, after) };
			return { ...block.content, items };
		}
		default:
			return null;
	}
};

const resumeSearchSchema = z.object({
	section: z.coerce.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/dash/resumes/$resumeId")({
	component: RouteComponent,
	loader: ({ params, context }) =>
		context.queryClient.ensureQueryData(
			orpc.resumes.get.queryOptions({
				input: { id: params.resumeId },
			})
		),
	pendingComponent: ResumeEditorPending,
	validateSearch: resumeSearchSchema,
});

function ResumeEditorPending() {
	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="flex shrink-0 flex-col items-start gap-4 border-b bg-background/80 ps-1 pe-4 pt-6 pb-4 backdrop-blur-md md:flex-row md:justify-between">
				<article className="w-full max-w-xl space-y-2 pl-3">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-7 w-64" />
				</article>
			</header>
			<section className="relative flex flex-1 gap-2 overflow-hidden bg-muted px-3 py-4">
				<article className="h-full w-72 shrink-0 space-y-2 rounded-lg bg-background p-2">
					<Skeleton className="h-6 w-full" />
					<Skeleton className="h-6 w-full" />
					<Skeleton className="h-6 w-2/3" />
				</article>
				<article className="min-w-0 flex-1 space-y-3 overflow-y-auto px-4 pb-16">
					<Skeleton className="h-10 w-1/2" />
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
				</article>
			</section>
		</section>
	);
}

function RouteComponent() {
	const params = Route.useParams();
	const navigate = useNavigate();
	const search = Route.useSearch();

	const focusedSectionId = search.section ?? null;
	const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: params.resumeId } });
	const { data } = useSuspenseQuery(resumeQuery);

	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [areSectionsOpen, setAreSectionsOpen] = useState(true);
	const [highlightedBlockId, setHighlightedBlockId] = useState<number | null>(null);

	const handleSelectSection = (id: number | null) => {
		setHighlightedBlockId(null);
		navigate({
			to: "/dash/resumes/$resumeId",
			params: { resumeId: params.resumeId },
			search: id === null ? {} : { section: id },
			replace: true,
		});
	};

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
	// the query). Tree shape is keyed by resume id + each block's id/parent/position,
	// so per-keystroke content saves don't trigger a reset.
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
		reconcileBlocks(form, nextValues.blocks);
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

	const railSections: SectionRailItem[] = rootBlocks.flatMap((block) =>
		block.blockType === "section"
			? [{ id: block.id, kind: getSectionKind(block.content), title: block.content.title }]
			: []
	);
	const contactBlockId = rootBlocks.find((block) => block.blockType === "contact")?.id ?? null;

	useEffect(() => {
		if (focusedSectionId === null) {
			return;
		}

		const exists =
			focusedSectionId === contactBlockId || railSections.some((section) => section.id === focusedSectionId);

		if (!exists) {
			navigate({
				to: "/dash/resumes/$resumeId",
				params: { resumeId: params.resumeId },
				search: {},
				replace: true,
			});
		}
	}, [railSections, contactBlockId, focusedSectionId, navigate, params.resumeId]);

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

	const handleViewSection = (edit: ResumeEdit) => {
		if (!edit.targetBlockId) {
			return;
		}

		const exists = form.state.values.blocks.some((block) => block.id === edit.targetBlockId);

		if (!exists) {
			toast.error("No se encontró el bloque correspondiente.");
			return;
		}
		// A targeted block may live in a non-focused (dimmed) section, so clear any
		// section focus to restore full opacity before pulsing the block.
		if (focusedSectionId !== null) {
			navigate({
				to: "/dash/resumes/$resumeId",
				params: { resumeId: params.resumeId },
				search: {},
				replace: true,
			});
		}

		setHighlightedBlockId(edit.targetBlockId);
	};

	const deleteBlock = useDeleteBlock({ form });

	const handleApplyEdit = (edit: ResumeEdit): boolean => {
		if (!edit.targetBlockId) {
			return false;
		}
		const blocks = form.state.values.blocks;
		const index = blocks.findIndex((block) => block.id === edit.targetBlockId);
		if (index === -1) {
			toast.error("No se encontró el bloque a editar.");
			return false;
		}
		const block = blocks[index];
		if (!block) {
			return false;
		}

		if (edit.action === "delete") {
			if (block.blockType === "contact") {
				toast.error("No se puede eliminar el bloque de contacto.");
				return false;
			}
			deleteBlock.mutate({ id: block.id, resumeId: params.resumeId });
			toast.success("Bloque eliminado");
			return true;
		}

		if (!(edit.before && edit.after)) {
			return false;
		}
		const replaced = applyRewriteToBlock(block as Block, edit.before, edit.after);
		if (replaced === null) {
			toast.error("No se encontró el texto exacto a reemplazar. Por favor editalo manualmente.");
			return false;
		}
		form.setFieldValue(`blocks[${index}].content`, replaced as typeof block.content);
		autosave.queueBlockSave(block.id);
		autosave.flushBlockSave(block.id);
		toast.success("Mejora aplicada");
		return true;
	};

	const saveStatusLabel = SAVE_STATUS_LABELS[autosave.saveStatus];

	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="flex shrink-0 flex-col items-center gap-4 border-b bg-background/80 py-2.5 ps-1 pe-4 backdrop-blur-md md:flex-row md:justify-between">
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
							<div className="max-w-xs ps-2">
								<InlineTextEditor
									onBlur={() => field.handleBlur()}
									onChange={(value) => field.handleChange(value)}
									placeholder="Título del CV"
									value={field.state.value ?? ""}
									variant="subtitle"
								/>
							</div>
						)}
					</form.AppField>
				</article>

				<article className="flex items-center gap-2">
					<Group>
						<NewSectionSheet form={form} size="sm" />

						<GroupSeparator />

						<Button size="sm" variant="outline">
							<ExportIcon />
							Exportar
						</Button>

						<GroupSeparator />

						<Button size="sm" variant="outline">
							<CopyIcon />
							Duplicar
						</Button>
					</Group>

					<Button onClick={() => setIsDeleteOpen(true)} size="sm" variant="destructive-outline">
						<TrashSimpleIcon />
						Borrar
					</Button>
				</article>
			</header>

			<section className="relative flex flex-1 gap-2 overflow-hidden bg-muted px-3 pt-3">
				<article className="flex h-full w-80 shrink-0 flex-col gap-2 overflow-hidden">
					<Collapsible
						className="shrink-0 rounded-lg bg-background"
						onOpenChange={setAreSectionsOpen}
						open={areSectionsOpen}
					>
						<CollapsibleTrigger className="w-full justify-between" render={<Button size="lg" variant="ghost-muted" />}>
							Secciones
							<CaretDownIcon className={cn("transition-transform", !areSectionsOpen && "-rotate-90")} />
						</CollapsibleTrigger>
						<CollapsiblePanel className="px-2 pb-2">
							<SectionRail
								activeId={focusedSectionId}
								contactId={contactBlockId}
								onSelect={handleSelectSection}
								sections={railSections}
							/>
						</CollapsiblePanel>
					</Collapsible>

					<ResumeAnalysisSection
						onApplyEdit={handleApplyEdit}
						onViewSection={handleViewSection}
						resumeId={params.resumeId}
					/>
				</article>

				<article className="min-w-0 flex-1 overflow-y-auto">
					<ResumeDocument
						blockIndexById={blockIndexById}
						focusedSectionId={focusedSectionId}
						form={form}
						highlightedBlockId={highlightedBlockId}
						rootBlocks={rootBlocks}
					/>
				</article>
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
							No, retrocede porfa
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

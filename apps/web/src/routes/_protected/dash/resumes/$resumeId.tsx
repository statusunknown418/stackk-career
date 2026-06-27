import { CaretDownIcon, ExportIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import type { ResumeEdit } from "@stackk-career/schemas/ai/resume-analysis";
import { getSectionKind } from "@stackk-career/schemas/api/resumes";
import { buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { useStore } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDate } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ResumeJobTargetPanel } from "@/components/domains/billing/resume-job-target-note";
import { exportResumeToPdf } from "@/components/domains/resume-document/export-pdf";
import { InlineTextEditor } from "@/components/domains/resume-document/inline-text-editor";
import { ResumeDocument } from "@/components/domains/resume-document/resume-document";
import { NewSectionSheet } from "@/components/domains/resume-editor/new-section-sheet";
import {
	type AppliedEditRewrites,
	ResumeAnalysisSection,
} from "@/components/domains/resume-editor/resume-analysis-section";
import { SectionRail, type SectionRailItem } from "@/components/domains/resume-editor/section-rail";
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

const RAIL_SKELETON_KEYS = ["all", "contact", "summary", "experience", "education", "skills"] as const;
const DOC_SECTION_SKELETON_KEYS = ["summary", "experience", "education"] as const;

function ResumeEditorPending() {
	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="flex shrink-0 flex-col items-center gap-4 border-b py-2.5 ps-1 pe-4 md:flex-row md:justify-between">
				<article className="w-full max-w-xl space-y-2">
					<div className="flex items-center gap-3 pl-3">
						<Skeleton className="h-4 w-44" />
					</div>
					<div className="max-w-xs ps-2">
						<Skeleton className="h-7 w-48" />
					</div>
				</article>

				<article className="flex items-center gap-2">
					<Skeleton className="h-7 w-72 rounded-lg" />
					<Skeleton className="h-7 w-24 rounded-lg" />
				</article>
			</header>

			<section className="relative flex flex-1 gap-2 overflow-hidden px-3 pt-3">
				<aside className="flex h-full min-h-0 w-54 shrink-0 flex-col overflow-y-auto pb-3">
					<div className="shrink-0 space-y-2 rounded-lg bg-card p-2">
						<Skeleton className="h-9 w-full rounded-lg" />
						<div className="space-y-1 px-1">
							{RAIL_SKELETON_KEYS.map((key) => (
								<Skeleton className="h-8 w-full rounded-md" key={key} />
							))}
						</div>
					</div>
				</aside>

				<article className="min-w-0 flex-1 overflow-y-auto">
					<section className="mx-auto w-full max-w-3xl">
						<article className="flex w-full flex-col rounded-md bg-card p-8 shadow-inner shadow-muted ring-1 ring-border/40">
							<div className="mb-8 flex flex-col items-center gap-2">
								<Skeleton className="h-8 w-64" />
								<Skeleton className="h-4 w-48" />
							</div>
							<div className="space-y-8">
								{DOC_SECTION_SKELETON_KEYS.map((key) => (
									<div className="space-y-3" key={key}>
										<Skeleton className="h-6 w-56" />
										<div className="h-px w-full bg-border" />
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-4/5" />
									</div>
								))}
							</div>
						</article>
					</section>
				</article>

				<aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-y-auto pb-3">
					<div className="flex flex-col gap-3 rounded-lg bg-card p-3">
						<div className="space-y-1.5">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-3 w-48" />
						</div>
						<Skeleton className="h-16 w-full rounded-md" />
					</div>
				</aside>
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
	const [highlightedBlockVersion, setHighlightedBlockVersion] = useState(0);

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

	const hasJobExperience = rootBlocks.some(
		(block) =>
			block.blockType === "section" &&
			getSectionKind(block.content) === "experience" &&
			block.children.some(
				(child) =>
					child.blockType === "entry" &&
					(child.content.title.trim() !== "" || (child.content.subtitle?.trim() ?? "") !== "")
			)
	);

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

	const handleExport = () => {
		try {
			exportResumeToPdf({ rootBlocks, title: form.state.values.title });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo exportar el CV");
		}
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
		if (focusedSectionId !== null) {
			navigate({
				to: "/dash/resumes/$resumeId",
				params: { resumeId: params.resumeId },
				search: {},
				replace: true,
			});
		}

		setHighlightedBlockId(edit.targetBlockId);
		setHighlightedBlockVersion((version) => version + 1);
	};

	const handleEditsApplied = (rewrites: AppliedEditRewrites) => {
		// The server applied the content change and recorded the status atomically.
		// Mirror the authoritative block content into the live form so the user sees
		// rewrites immediately; deletes are reflected once the invalidated resume
		// query refetches and the hydration effect reconciles the smaller tree.
		const blocks = form.state.values.blocks;
		for (const rewrite of rewrites) {
			const index = blocks.findIndex((block) => block.id === rewrite.blockId);
			const block = index === -1 ? undefined : blocks[index];
			if (!block) {
				continue;
			}
			form.setFieldValue(`blocks[${index}].content`, rewrite.content as typeof block.content);
		}
	};

	const saveStatusLabel = SAVE_STATUS_LABELS[autosave.saveStatus];

	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="flex shrink-0 flex-col items-center gap-4 border-b py-2.5 ps-1 pe-4 md:flex-row md:justify-between">
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

						<Button onClick={handleExport} size="sm" variant="outline">
							<ExportIcon />
							Exportar
						</Button>
					</Group>

					<Button onClick={() => setIsDeleteOpen(true)} size="sm" variant="destructive-outline">
						<TrashSimpleIcon />
						Borrar
					</Button>
				</article>
			</header>

			<section className="relative flex flex-1 gap-2 overflow-hidden px-3 pt-3">
				<aside className="flex h-full min-h-0 w-64 shrink-0 flex-col gap-2 pb-2">
					<Collapsible className="shrink-0 rounded-lg bg-card" onOpenChange={setAreSectionsOpen} open={areSectionsOpen}>
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
					<div className="min-h-0 overflow-y-auto">
						<ResumeJobTargetPanel resumeId={params.resumeId} />
					</div>
				</aside>

				<article className="min-w-0 flex-1 overflow-y-auto">
					<ResumeDocument
						blockIndexById={blockIndexById}
						focusedSectionId={focusedSectionId}
						form={form}
						highlightedBlockId={highlightedBlockId}
						highlightedBlockVersion={highlightedBlockVersion}
						rootBlocks={rootBlocks}
					/>
				</article>

				<aside className="flex h-full min-h-0 w-80 shrink-0 flex-col pb-3">
					<div className="min-h-0 overflow-y-auto">
						<ResumeAnalysisSection
							flushPendingSaves={autosave.flushAndWait}
							hasJobExperience={hasJobExperience}
							onEditsApplied={handleEditsApplied}
							onViewSection={handleViewSection}
							resumeId={params.resumeId}
						/>
					</div>
				</aside>
			</section>

			<AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
				<AlertDialogPopup>
					<AlertDialogHeader>
						<AlertDialogTitle>Estás seguro que quieres borrar este CV?</AlertDialogTitle>
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

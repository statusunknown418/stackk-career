import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	CaretDownIcon,
	CheckCircleIcon,
	InfoIcon,
	ListChecksIcon,
	LockSimpleIcon,
	QuestionIcon,
	TargetIcon,
	TrashSimpleIcon,
	TrendUpIcon,
	TriangleDashedIcon,
	WarningCircleIcon,
	WrenchIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr";
import type {
	EditCategory,
	EditSeverity,
	ResumeAnalysis,
	ResumeAnalysisEditStatuses,
	ResumeEdit,
	ResumeScoreCeiling,
	ResumeUserInputRequest,
} from "@stackk-career/schemas/ai/resume-analysis";
import type { DeepPartial } from "ai";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Gauge } from "@/components/gauge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Group, GroupSeparator } from "@/components/ui/group";
import { Item, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemTitle } from "@/components/ui/item";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SCORE_ROWS: { key: keyof ResumeAnalysis["scoreBreakdown"]; label: string }[] = [
	{ key: "impact", label: "Impacto" },
	{ key: "keywords", label: "Keywords" },
	{ key: "clarity", label: "Claridad" },
	{ key: "formatting", label: "Formato" },
	{ key: "length", label: "Longitud" },
];

const CATEGORY_LABEL: Record<EditCategory, string> = {
	impact: "Impacto",
	keywords: "Keywords",
	clarity: "Claridad",
	formatting: "Formato",
	length: "Longitud",
};

const SEVERITY_LABEL: Record<EditSeverity, string> = {
	"top-win": "Top win",
	missing: "Falta clave",
	"soft-signal": "Señal suave",
};

const SEVERITY_BADGE: Record<EditSeverity, NonNullable<BadgeProps["variant"]>> = {
	"top-win": "success",
	missing: "info",
	"soft-signal": "warning",
};

const EDIT_PLACEHOLDERS = [0, 1, 2, 3, 4] as const;
const TRUNCATE_LENGTH = 80;
const APPLY_ALL_THRESHOLD = 2;

interface EditHandlers {
	onApplyEdit?: (edit: ResumeEdit) => void;
	onDismissEdit?: (editId: string, dismissed: boolean) => void;
	onViewSection?: (edit: ResumeEdit) => void;
}

interface EditRenderContext extends EditHandlers {
	editStatuses?: ResumeAnalysisEditStatuses;
	expanded: Set<string>;
	onToggle: (key: string) => void;
	pendingEditId?: string;
}

function EditActions({
	edit,
	isApplied,
	isDelete,
	isPending,
	handlers,
}: {
	edit: ResumeEdit;
	isApplied: boolean;
	isDelete: boolean;
	isPending: boolean;
	handlers: EditHandlers;
}) {
	const { onApplyEdit, onDismissEdit, onViewSection } = handlers;
	const labels = isDelete
		? { Icon: TrashSimpleIcon, apply: "Eliminar", applyTitle: "Eliminar del CV", applied: "Eliminado" }
		: { Icon: WrenchIcon, apply: "Aplicar", applyTitle: "Aplicar al CV", applied: "Aplicado" };
	const hasBlock = Boolean(edit.targetBlockId);
	const canApply = !isApplied && edit.applyability === "one_click" && Boolean(edit.editId);
	const canView = hasBlock && !(isApplied && isDelete);
	const showApply = Boolean(onApplyEdit) && canApply;
	const showView = Boolean(onViewSection) && canView;
	const showSeparator = (isApplied || showApply) && showView;

	return (
		<Group>
			{isApplied && (
				<Button size="xs" variant="secondary">
					<CheckCircleIcon className="text-success" weight="fill" />
					{labels.applied}
				</Button>
			)}

			{showApply && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label={labels.applyTitle}
								disabled={isPending}
								onClick={() => onApplyEdit?.(edit)}
								size="xs"
								variant="secondary"
							/>
						}
					>
						<labels.Icon /> {labels.apply}
					</TooltipTrigger>
					<TooltipContent>{labels.applyTitle}</TooltipContent>
				</Tooltip>
			)}

			{showSeparator && <GroupSeparator />}

			{showView && (
				<>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button aria-label="Ver sección" onClick={() => onViewSection?.(edit)} size="xs" variant="secondary" />
							}
						>
							<EyeIcon /> Ver
						</TooltipTrigger>
						<TooltipContent>Ver sección</TooltipContent>
					</Tooltip>

					<GroupSeparator />
				</>
			)}

			{onDismissEdit && edit.editId && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="Descartar sugerencia"
								onClick={() => onDismissEdit(edit.editId, true)}
								size="xs"
								variant="secondary"
							/>
						}
					>
						<XCircleIcon />
					</TooltipTrigger>
					<TooltipContent>Descartar</TooltipContent>
				</Tooltip>
			)}
		</Group>
	);
}

function DismissedEditItem({ edit, handlers }: { edit: ResumeEdit; handlers: EditHandlers }) {
	const { onDismissEdit } = handlers;
	return (
		<Item className="gap-2 opacity-50 hover:opacity-100" size="sm" variant="outline">
			<ItemContent className="min-w-0">
				<ItemTitle className="block w-full truncate text-xs leading-tight line-through">{edit.title}</ItemTitle>
			</ItemContent>

			{onDismissEdit && edit.editId && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="Restaurar sugerencia"
								onClick={() => onDismissEdit(edit.editId, false)}
								size="xs"
								variant="secondary"
							/>
						}
					>
						<ArrowCounterClockwiseIcon />
					</TooltipTrigger>
					<TooltipContent>Restaurar</TooltipContent>
				</Tooltip>
			)}
		</Item>
	);
}

function EditItem({ edit, editKey, ctx }: { edit: DeepPartial<ResumeEdit>; editKey: string; ctx: EditRenderContext }) {
	const completeEdit = edit as ResumeEdit;
	const record = completeEdit.editId ? ctx.editStatuses?.[completeEdit.editId] : undefined;

	if (record?.status === "dismissed") {
		return <DismissedEditItem edit={completeEdit} handlers={ctx} />;
	}

	const isApplied = record?.status === "applied";
	const isUnresolved = record?.status === "stale" || record?.status === "failed";
	const isDelete = completeEdit.action === "delete";
	const isPending = Boolean(completeEdit.editId) && completeEdit.editId === ctx.pendingEditId;
	const description = edit.description ?? "";
	const isExpanded = ctx.expanded.has(editKey);
	const isTruncatable = description.length > TRUNCATE_LENGTH;

	return (
		<Item
			className={cn("gap-3 transition-opacity", isApplied && "opacity-60 hover:opacity-100")}
			size="sm"
			variant="outline"
		>
			<ItemHeader className="flex">
				<EditActions
					edit={completeEdit}
					handlers={ctx}
					isApplied={isApplied}
					isDelete={isDelete}
					isPending={isPending}
				/>
			</ItemHeader>

			<ItemContent className="gap-1">
				<ItemTitle className="text-sm leading-tight">{edit.title}</ItemTitle>
				<ItemDescription className={cn("text-xs leading-snug", isExpanded && "line-clamp-none")}>
					{description}
				</ItemDescription>

				{isTruncatable && (
					<button
						className="group inline-flex w-max items-center gap-1 rounded bg-secondary px-1 text-primary text-xs hover:underline"
						onClick={() => ctx.onToggle(editKey)}
						type="button"
					>
						{isExpanded ? "Ver menos" : "Ver más"}
						<CaretDownIcon className={cn(isExpanded && "rotate-180")} />
					</button>
				)}

				{isUnresolved && (
					<p className="flex items-center gap-1 text-warning text-xs">
						<WarningCircleIcon className="shrink-0" />
						No se pudo aplicar; el CV cambió desde el análisis. Vuelve a analizarlo.
					</p>
				)}
			</ItemContent>

			<ItemFooter>
				<Badge variant={SEVERITY_BADGE[edit.severity as EditSeverity]}>+{edit.delta} pts</Badge>
				<small className="truncate text-muted-foreground text-xs">
					{CATEGORY_LABEL[edit.category as EditCategory]} · {SEVERITY_LABEL[edit.severity as EditSeverity]}
				</small>
			</ItemFooter>
		</Item>
	);
}

function ScoreSection({
	partial,
	hasJobTarget,
	showLoaders,
}: {
	partial: DeepPartial<ResumeAnalysis>;
	hasJobTarget?: boolean;
	showLoaders: boolean;
}) {
	return (
		<Collapsible render={<section aria-label="Puntaje" />}>
			<header className="grid place-items-center gap-2">
				<p className="flex items-center gap-1 text-muted-foreground text-xs">
					{hasJobTarget && <TargetIcon className="shrink-0" />}
					{hasJobTarget ? "Puntaje para este puesto" : "Puntaje general"}
				</p>

				{typeof partial.scoreOverall === "number" ? (
					<Gauge value={partial.scoreOverall} />
				) : (
					<Skeleton className="size-32 rounded-full" />
				)}

				<CollapsibleTrigger
					render={
						<Button className="group w-full" size="xs" variant="secondary">
							Detalles
							<CaretDownIcon className="transition-transform group-data-panel-open:rotate-180" />
						</Button>
					}
				/>
			</header>

			<CollapsibleContent>
				<ul className="flex flex-col gap-2 pt-4">
					{SCORE_ROWS.map((row) => {
						const value = partial.scoreBreakdown?.[row.key];

						if (typeof value !== "number") {
							return (
								<li className="flex flex-col gap-1.5" key={row.key}>
									<span className="font-medium text-xs">{row.label}</span>
									{showLoaders && <Skeleton className="h-2 w-full rounded-full" />}
								</li>
							);
						}

						return (
							<li key={row.key}>
								<Progress value={value}>
									<header className="flex items-center justify-between text-xs">
										<ProgressLabel>{row.label}</ProgressLabel>
										<ProgressValue />
									</header>
									<ProgressTrack>
										<ProgressIndicator />
									</ProgressTrack>
								</Progress>
							</li>
						);
					})}
				</ul>
			</CollapsibleContent>
		</Collapsible>
	);
}

function CeilingSection({
	ceiling,
	currentScore,
}: {
	ceiling: DeepPartial<ResumeScoreCeiling>;
	currentScore?: number;
}) {
	const blockers = (ceiling.blockers ?? []).filter((blocker): blocker is string => Boolean(blocker));
	const showCeilingScore =
		typeof ceiling.scoreOverall === "number" && typeof currentScore === "number" && ceiling.scoreOverall > currentScore;

	if (!(showCeilingScore || blockers.length > 0)) {
		return null;
	}

	return (
		<section aria-label="Techo y bloqueos" className="flex flex-col gap-2">
			{showCeilingScore && (
				<div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<TrendUpIcon className="shrink-0" />
						Techo con mejoras de un clic
					</span>
					<span className="text-foreground">{ceiling.scoreOverall}</span>
				</div>
			)}

			{blockers.length > 0 && (
				<Alert variant="warning">
					<WarningCircleIcon />
					<AlertTitle>Bloqueos para llegar a 100</AlertTitle>
					<AlertDescription>
						<ul className="ml-4 list-disc space-y-0.5">
							{blockers.map((blocker) => (
								<li key={blocker}>{blocker}</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}
		</section>
	);
}

function DraftEditsSection({
	edits,
	ctx,
	showLoaders,
}: {
	edits: DeepPartial<ResumeEdit>[];
	ctx: EditRenderContext;
	showLoaders: boolean;
}) {
	return (
		<section aria-label="Mejoras sugeridas" className="flex flex-col gap-2">
			<header className="text-muted-foreground text-xs">
				{edits.length ? `+${edits.length} mejoras de mayor impacto` : <Shimmer>Buscando mejoras…</Shimmer>}
			</header>

			<ItemGroup className="gap-2">
				{EDIT_PLACEHOLDERS.map((slot) => {
					const edit = edits[slot];
					const isComplete = Boolean(
						edit?.title && edit.description && typeof edit.delta === "number" && edit.category && edit.severity
					);

					if (!(isComplete && edit)) {
						return showLoaders && <Skeleton className="h-16 w-full rounded-xl" key={slot} />;
					}

					return <EditItem ctx={ctx} edit={edit} editKey={`slot-${slot}`} key={slot} />;
				})}
			</ItemGroup>
		</section>
	);
}

function EditGroupSection({
	title,
	icon: Icon,
	edits,
	ctx,
	onApplyAll,
	isApplyingAll,
	showApplyAll,
}: {
	title: string;
	icon: typeof InfoIcon;
	edits: DeepPartial<ResumeEdit>[];
	ctx: EditRenderContext;
	onApplyAll?: () => void;
	isApplyingAll?: boolean;
	showApplyAll?: boolean;
}) {
	return (
		<section aria-label={title} className="flex flex-col gap-2">
			<header className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
				<span className="flex items-center gap-1.5">
					<Icon className="shrink-0" />
					{title}
				</span>

				{showApplyAll && onApplyAll && (
					<Button disabled={isApplyingAll} onClick={onApplyAll} size="xs" variant="secondary">
						<WrenchIcon />
						Aplicar todas
					</Button>
				)}
			</header>

			<ItemGroup className="gap-2">
				{edits.map((edit) => (
					<EditItem ctx={ctx} edit={edit} editKey={(edit as ResumeEdit).editId} key={(edit as ResumeEdit).editId} />
				))}
			</ItemGroup>
		</section>
	);
}

function UserInputRequestsSection({ requests }: { requests: DeepPartial<ResumeUserInputRequest>[] }) {
	return (
		<section aria-label="Datos que solo tú puedes aportar" className="flex flex-col gap-2">
			<header className="flex items-center gap-1.5 text-muted-foreground text-xs">
				<LockSimpleIcon className="shrink-0" />
				Datos que solo tú puedes aportar
			</header>

			<ItemGroup className="gap-2">
				{requests.map((request) => {
					const complete = request as ResumeUserInputRequest;
					return (
						<Item className="gap-1.5" key={complete.id} size="sm" variant="outline">
							<ItemContent className="gap-1">
								<ItemTitle className="flex items-start gap-1.5 text-sm leading-tight">
									<QuestionIcon className="mt-0.5 shrink-0" />
									{complete.question}
								</ItemTitle>
								<ItemDescription className="text-xs leading-snug">{complete.whyItMatters}</ItemDescription>
							</ItemContent>
							<ItemFooter>
								<Badge variant="info">Hasta +{complete.unlocksPotentialPoints} pts</Badge>
							</ItemFooter>
						</Item>
					);
				})}
			</ItemGroup>
		</section>
	);
}

function PanelHeader({
	error,
	isStreaming,
	hasAnalysis,
	onRetry,
}: {
	error: Error | undefined;
	isStreaming: boolean;
	hasAnalysis: boolean;
	onRetry?: () => void;
}) {
	const canRetry = onRetry && !isStreaming && (hasAnalysis || error);
	return (
		<header className="flex items-start justify-between gap-2">
			<hgroup>
				<h3 className="font-medium text-muted-foreground text-sm">Análisis de tu CV</h3>
				<Badge variant="secondary">
					{error && "Error"}
					{!error && isStreaming && <Shimmer>Analizando…</Shimmer>}
					{!(error || isStreaming) && hasAnalysis && "Listo"}
					{!(error || isStreaming || hasAnalysis) && "Esperando CV"}
				</Badge>
			</hgroup>

			{canRetry && (
				<Tooltip>
					<TooltipTrigger
						render={<Button aria-label="Recalcular puntaje" onClick={onRetry} size="xs" variant="outline" />}
					>
						<ArrowClockwiseIcon />
						Recalcular
					</TooltipTrigger>
					<TooltipContent>Revisar el CV actualizado</TooltipContent>
				</Tooltip>
			)}
		</header>
	);
}

export function ResumeEditorAnalysisPanel({
	analysis,
	editStatuses,
	error,
	hasJobTarget,
	isApplyingAll,
	isStreaming,
	onApplyAll,
	onApplyEdit,
	onDismissEdit,
	onRetry,
	onViewSection,
	pendingEditId,
}: {
	analysis: DeepPartial<ResumeAnalysis> | undefined;
	editStatuses?: ResumeAnalysisEditStatuses;
	error: Error | undefined;
	hasJobTarget?: boolean;
	isApplyingAll?: boolean;
	isStreaming: boolean;
	onApplyAll?: () => void;
	onApplyEdit?: (edit: ResumeEdit) => void;
	onDismissEdit?: (editId: string, dismissed: boolean) => void;
	onRetry?: () => void;
	onViewSection?: (edit: ResumeEdit) => void;
	pendingEditId?: string;
}) {
	const partial = analysis;
	const showLoaders = !error && isStreaming;
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

	const onToggle = (key: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const ctx: EditRenderContext = {
		editStatuses,
		pendingEditId,
		expanded,
		onToggle,
		onApplyEdit,
		onDismissEdit,
		onViewSection,
	};

	const allEdits = (partial?.edits ?? []).filter((edit): edit is DeepPartial<ResumeEdit> => Boolean(edit));
	const hasNormalizedEdits = allEdits.some((edit) => Boolean((edit as ResumeEdit).editId));
	const oneClickEdits = allEdits.filter((edit) => (edit as ResumeEdit).applyability === "one_click");
	const informationalEdits = allEdits.filter((edit) => (edit as ResumeEdit).applyability === "informational");
	const applyableCount = oneClickEdits.filter((edit) => {
		const status = editStatuses?.[(edit as ResumeEdit).editId]?.status;
		return status !== "applied" && status !== "dismissed";
	}).length;
	const showApplyAll = Boolean(onApplyAll) && applyableCount >= APPLY_ALL_THRESHOLD;

	const userInputRequests = (partial?.userInputRequests ?? []).filter(
		(request): request is DeepPartial<ResumeUserInputRequest> => Boolean(request?.question)
	);
	const showDraftEdits = !hasNormalizedEdits && (showLoaders || allEdits.length > 0);

	return (
		<section className="flex flex-col gap-4 rounded-lg bg-card p-3">
			<PanelHeader error={error} hasAnalysis={Boolean(partial)} isStreaming={isStreaming} onRetry={onRetry} />

			{(partial || showLoaders) && (
				<ScoreSection hasJobTarget={hasJobTarget} partial={partial ?? {}} showLoaders={showLoaders} />
			)}

			{partial?.scoreCeiling && <CeilingSection ceiling={partial.scoreCeiling} currentScore={partial.scoreOverall} />}

			{showDraftEdits && <DraftEditsSection ctx={ctx} edits={allEdits} showLoaders={showLoaders} />}

			{hasNormalizedEdits && oneClickEdits.length > 0 && (
				<EditGroupSection
					ctx={ctx}
					edits={oneClickEdits}
					icon={ListChecksIcon}
					isApplyingAll={isApplyingAll}
					onApplyAll={onApplyAll}
					showApplyAll={showApplyAll}
					title="Mejoras de un clic"
				/>
			)}

			{hasNormalizedEdits && informationalEdits.length > 0 && (
				<EditGroupSection ctx={ctx} edits={informationalEdits} icon={InfoIcon} title="Otras sugerencias" />
			)}

			{userInputRequests.length > 0 && <UserInputRequestsSection requests={userInputRequests} />}

			{error && (
				<Alert variant="error">
					<TriangleDashedIcon />
					<AlertTitle>No pudimos completar el análisis</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			)}
		</section>
	);
}

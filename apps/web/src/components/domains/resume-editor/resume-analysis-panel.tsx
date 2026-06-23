import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	CaretDownIcon,
	CheckCircleIcon,
	TrashSimpleIcon,
	TriangleDashedIcon,
	WrenchIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr";
import type { EditCategory, EditSeverity, ResumeAnalysis, ResumeEdit } from "@stackk-career/schemas/ai/resume-analysis";
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

export function ResumeEditorAnalysisPanel({
	analysis,
	appliedSlots,
	dismissedSlots,
	error,
	isStreaming,
	onApplyEdit,
	onDismissEdit,
	onRetry,
	onViewSection,
}: {
	analysis: DeepPartial<ResumeAnalysis> | undefined;
	appliedSlots?: Set<number>;
	dismissedSlots?: Set<number>;
	error: Error | undefined;
	isStreaming: boolean;
	onApplyEdit?: (edit: ResumeEdit, slot: number) => void;
	onDismissEdit?: (slot: number, dismissed: boolean) => void;
	onRetry?: () => void;
	onViewSection?: (edit: ResumeEdit) => void;
}) {
	const partial = analysis;
	const showLoaders = !error && isStreaming;
	const canRetry = onRetry && !isStreaming && (partial || error);
	const [expandedSlots, setExpandedSlots] = useState<Set<number>>(() => new Set());

	const toggleSlot = (slot: number) => {
		setExpandedSlots((prev) => {
			const next = new Set(prev);
			if (next.has(slot)) {
				next.delete(slot);
			} else {
				next.add(slot);
			}
			return next;
		});
	};

	const renderActions = (slot: number, completeEdit: ResumeEdit, isApplied: boolean, isDelete: boolean) => {
		const labels = isDelete
			? {
					Icon: TrashSimpleIcon,
					apply: "Eliminar",
					applyTitle: "Eliminar del CV",
					applied: "Eliminado",
				}
			: {
					Icon: WrenchIcon,
					apply: "Aplicar",
					applyTitle: "Aplicar al CV",
					applied: "Aplicado",
				};
		const hasBlock = Boolean(completeEdit.targetBlockId);
		const hasRewrite = Boolean(completeEdit.before && completeEdit.after);
		const canApply = !isApplied && hasBlock && (isDelete || hasRewrite);
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
									onClick={() => onApplyEdit?.(completeEdit, slot)}
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
									<Button
										aria-label="Ver sección"
										onClick={() => onViewSection?.(completeEdit)}
										size="xs"
										variant="secondary"
									/>
								}
							>
								<EyeIcon /> Ver
							</TooltipTrigger>
							<TooltipContent>Ver sección</TooltipContent>
						</Tooltip>

						<GroupSeparator />
					</>
				)}

				{onDismissEdit && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									aria-label="Descartar sugerencia"
									onClick={() => onDismissEdit(slot, true)}
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
	};

	return (
		<section className="flex flex-col gap-4 rounded-lg bg-card p-3">
			<header className="flex items-start justify-between gap-2">
				<hgroup>
					<h3 className="font-medium text-sm">Análisis de tu CV</h3>
					<Badge variant="secondary">
						{error && "Error"}
						{!error && isStreaming && <Shimmer>Analizando…</Shimmer>}
						{!(error || isStreaming) && partial && "Listo"}
						{!(error || isStreaming || partial) && "Esperando CV"}
					</Badge>
				</hgroup>

				{canRetry && (
					<Tooltip>
						<TooltipTrigger
							render={<Button aria-label="Reintentar análisis" onClick={onRetry} size="xs" variant="outline" />}
						>
							<ArrowClockwiseIcon />
							Re-analizar
						</TooltipTrigger>
						<TooltipContent>Reintentar análisis</TooltipContent>
					</Tooltip>
				)}
			</header>

			{(partial || showLoaders) && (
				<Collapsible render={<section aria-label="Puntaje" />}>
					<header className="grid place-items-center gap-4">
						{typeof partial?.scoreOverall === "number" ? (
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
								const value = partial?.scoreBreakdown?.[row.key];

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
			)}

			{(partial?.edits?.length || showLoaders) && (
				<section aria-label="Mejoras sugeridas" className="flex flex-col gap-2">
					<header className="text-muted-foreground text-xs">
						{partial?.edits?.length ? (
							`+${partial.edits.length} mejoras de mayor impacto`
						) : (
							<Shimmer>Buscando mejoras…</Shimmer>
						)}
					</header>

					<ItemGroup className="gap-2">
						{EDIT_PLACEHOLDERS.map((slot) => {
							const edit = partial?.edits?.[slot];
							const isComplete = Boolean(
								edit?.title && edit.description && typeof edit.delta === "number" && edit.category && edit.severity
							);

							if (!isComplete) {
								return showLoaders && <Skeleton className="h-16 w-full rounded-xl" key={slot} />;
							}

							const description = edit?.description ?? "";
							const isExpanded = expandedSlots.has(slot);
							const isTruncatable = description.length > 80;
							const completeEdit = edit as ResumeEdit;
							const isDelete = completeEdit.action === "delete";
							const isApplied = appliedSlots?.has(slot) ?? false;
							const isDismissed = dismissedSlots?.has(slot) ?? false;

							if (isDismissed) {
								return (
									<Item className="gap-2 opacity-50 hover:opacity-100" key={slot} size="sm" variant="outline">
										<ItemContent>
											<ItemTitle className="truncate text-xs leading-tight line-through">{edit?.title}</ItemTitle>
										</ItemContent>

										{onDismissEdit && (
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															aria-label="Restaurar sugerencia"
															onClick={() => onDismissEdit(slot, false)}
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

							return (
								<Item
									className={cn("gap-3 transition-opacity", isApplied && "opacity-60 hover:opacity-100")}
									key={slot}
									size="sm"
									variant="outline"
								>
									<ItemHeader className="flex">{renderActions(slot, completeEdit, isApplied, isDelete)}</ItemHeader>

									<ItemContent className="gap-1">
										<ItemTitle className="text-sm leading-tight">{edit?.title}</ItemTitle>
										<ItemDescription className={cn("text-xs leading-snug", isExpanded && "line-clamp-none")}>
											{description}
										</ItemDescription>

										{isTruncatable && (
											<button
												className="group inline-flex w-max items-center gap-1 rounded bg-secondary px-1 text-primary text-xs hover:underline"
												onClick={() => toggleSlot(slot)}
												type="button"
											>
												{isExpanded ? "Ver menos" : "Ver más"}

												<CaretDownIcon className={cn(isExpanded && "rotate-180")} />
											</button>
										)}
									</ItemContent>

									<ItemFooter>
										<Badge variant={SEVERITY_BADGE[edit?.severity as EditSeverity]}>+{edit?.delta} pts</Badge>

										<small className="truncate text-muted-foreground text-xs">
											{CATEGORY_LABEL[edit?.category as EditCategory]} ·{" "}
											{SEVERITY_LABEL[edit?.severity as EditSeverity]}
										</small>
									</ItemFooter>
								</Item>
							);
						})}
					</ItemGroup>
				</section>
			)}

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

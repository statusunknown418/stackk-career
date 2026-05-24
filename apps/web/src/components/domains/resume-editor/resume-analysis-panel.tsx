import {
	ArrowClockwiseIcon,
	CaretDownIcon,
	CheckCircleIcon,
	TrashSimpleIcon,
	TriangleDashedIcon,
	WrenchIcon,
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

function EditCardActions({
	completeEdit,
	canApply,
	canView,
	isApplied,
	isDelete,
	slot,
	onApplyEdit,
	onViewSection,
}: {
	completeEdit: ResumeEdit;
	canApply: boolean;
	canView: boolean;
	isApplied: boolean;
	isDelete: boolean;
	slot: number;
	onApplyEdit?: (edit: ResumeEdit, slot: number) => void;
	onViewSection?: (edit: ResumeEdit) => void;
}) {
	const viewTooltip = onViewSection && canView && (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						aria-label="Ver sección"
						onClick={() => onViewSection(completeEdit)}
						size="xs"
						variant={isApplied ? "ghost" : "secondary"}
					/>
				}
			>
				<EyeIcon /> Ver
			</TooltipTrigger>
			<TooltipContent>Ver sección</TooltipContent>
		</Tooltip>
	);

	if (isApplied) {
		return (
			<Group>
				<span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 font-medium text-[11px] text-success">
					<CheckCircleIcon weight="fill" />
					{isDelete ? "Eliminado" : "Aplicado"}
				</span>
				{viewTooltip && (
					<>
						<GroupSeparator />
						{viewTooltip}
					</>
				)}
			</Group>
		);
	}

	return (
		<Group>
			{onApplyEdit && canApply && (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label={isDelete ? "Eliminar del CV" : "Aplicar al CV"}
								onClick={() => onApplyEdit(completeEdit, slot)}
								size="xs"
								variant="secondary"
							/>
						}
					>
						{isDelete ? (
							<>
								<TrashSimpleIcon /> Eliminar
							</>
						) : (
							<>
								<WrenchIcon /> Aplicar
							</>
						)}
					</TooltipTrigger>
					<TooltipContent>{isDelete ? "Eliminar del CV" : "Aplicar al CV"}</TooltipContent>
				</Tooltip>
			)}
			{viewTooltip && (
				<>
					{onApplyEdit && canApply && <GroupSeparator />}
					{viewTooltip}
				</>
			)}
		</Group>
	);
}

export function ResumeEditorAnalysisPanel({
	analysis,
	appliedSlots,
	error,
	isStreaming,
	onApplyEdit,
	onRetry,
	onViewSection,
}: {
	analysis: DeepPartial<ResumeAnalysis> | undefined;
	appliedSlots?: Set<number>;
	error: Error | undefined;
	isStreaming: boolean;
	onApplyEdit?: (edit: ResumeEdit, slot: number) => void;
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

	return (
		<section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-lg bg-background p-3">
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
						<Gauge value={partial?.scoreOverall ?? 0} />

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
				<section aria-label="Mejoras sugeridas" className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
					<header className="text-muted-foreground text-xs">
						+{partial?.edits?.length ?? "X"} mejoras de mayor impacto
					</header>

					<ItemGroup className="min-h-0 flex-1 gap-2 overflow-y-auto">
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
							const canApply =
								!isApplied &&
								Boolean(completeEdit.targetBlockId && (isDelete || (completeEdit.before && completeEdit.after)));
							const canView = !(isApplied && isDelete) && Boolean(completeEdit.targetBlockId);

							return (
								<Item
									className={cn("gap-3 transition-opacity duration-200", isApplied && "opacity-60 hover:opacity-100")}
									key={slot}
									size="sm"
									variant="outline"
								>
									<ItemHeader className="flex justify-end">
										<EditCardActions
											canApply={canApply}
											canView={canView}
											completeEdit={completeEdit}
											isApplied={isApplied}
											isDelete={isDelete}
											onApplyEdit={onApplyEdit}
											onViewSection={onViewSection}
											slot={slot}
										/>
									</ItemHeader>

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

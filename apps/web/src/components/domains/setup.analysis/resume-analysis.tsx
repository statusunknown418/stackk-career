import {
	ArrowBendUpRightIcon,
	CaretCircleRightIcon,
	CheckCircleIcon,
	HashStraightIcon,
	TriangleDashedIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import type { EditCategory, EditSeverity, ResumeAnalysis } from "@stackk-career/schemas/ai/resume-analysis";
import { Link } from "@tanstack/react-router";
import type { DeepPartial } from "ai";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ResumePendingCards } from "@/components/domains/resumes/resume-pending-cards";
import { Gauge } from "@/components/gauge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { type ResumeDraftContext, useResumeDraftRuns } from "./use-resume-draft-runs";

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

export function ResumeAnalysisPanel({
	analysis,
	className,
	draft,
	error,
	isStreaming,
}: {
	analysis: DeepPartial<ResumeAnalysis> | undefined;
	className?: string;
	draft?: ResumeDraftContext;
	error: Error | undefined;
	isStreaming: boolean;
}) {
	const partial = analysis;
	const showLoaders = !error && isStreaming;

	return (
		<>
			<Frame className={className ?? "h-full max-h-[85svh]"}>
				<FrameHeader>
					<FrameTitle className="font-light text-xl tracking-tight">Análisis de tu CV</FrameTitle>
					<FrameDescription>
						{error && "Error"}
						{!error && isStreaming && <Shimmer>Analizando…</Shimmer>}
						{!(error || isStreaming) && partial && "Listo"}
						{!(error || isStreaming || partial) && "Esperando CV"}
					</FrameDescription>
				</FrameHeader>

				{(partial || showLoaders) && (
					<FramePanel className="flex gap-4">
						<Gauge value={partial?.scoreOverall ?? 0} />

						<div className="flex w-full flex-col gap-3">
							{SCORE_ROWS.map((row) => {
								const value = partial?.scoreBreakdown?.[row.key];
								if (typeof value !== "number") {
									return (
										<div className="flex flex-col gap-2" key={row.key}>
											<span className="font-medium text-sm">{row.label}</span>
											{showLoaders && <Skeleton className="h-1.5 w-full rounded-full" />}
										</div>
									);
								}
								return (
									<Progress key={row.key} value={value}>
										<div className="flex items-center justify-between">
											<ProgressLabel>{row.label}</ProgressLabel>
											<ProgressValue />
										</div>
										<ProgressTrack>
											<ProgressIndicator />
										</ProgressTrack>
									</Progress>
								);
							})}
						</div>
					</FramePanel>
				)}

				{(partial?.edits?.length || showLoaders) && (
					<>
						<FrameHeader>
							<FrameDescription>+{partial?.edits?.length ?? "X"} mejoras de mayor impacto</FrameDescription>
						</FrameHeader>

						<FramePanel className="flex flex-1 flex-col gap-3 overflow-y-scroll">
							{EDIT_PLACEHOLDERS.map((slot) => {
								const edit = partial?.edits?.[slot];
								const isComplete = Boolean(
									edit?.title && edit.description && typeof edit.delta === "number" && edit.category && edit.severity
								);

								if (!isComplete) {
									return showLoaders && <Skeleton className="h-24 w-full rounded-2xl" key={slot} />;
								}

								return (
									<Card key={slot}>
										<CardHeader>
											<CardTitle>{edit?.title}</CardTitle>
											<CardDescription>{edit?.description}</CardDescription>
										</CardHeader>

										<CardPanel className="flex items-center justify-between">
											<Badge className="max-w-max" size="lg" variant={SEVERITY_BADGE[edit?.severity as EditSeverity]}>
												+{edit?.delta} pts
											</Badge>

											<Badge variant="outline">
												<HashStraightIcon />
												<span className="text-muted-foreground">
													{CATEGORY_LABEL[edit?.category as EditCategory]} &middot;{" "}
												</span>{" "}
												{SEVERITY_LABEL[edit?.severity as EditSeverity]}
											</Badge>
										</CardPanel>
									</Card>
								);
							})}
						</FramePanel>
					</>
				)}

				{error && (
					<Alert className="mt-4" variant="error">
						<TriangleDashedIcon />
						<AlertTitle>No pudimos completar el análisis</AlertTitle>
						<AlertDescription>{error.message}</AlertDescription>
					</Alert>
				)}
			</Frame>

			{draft && <ResumeDraftSlot draft={draft} />}
		</>
	);
}

function ResumeDraftSlot({ draft }: { draft: ResumeDraftContext }): React.ReactElement | null {
	const { activeRun, completedRun, failedRun } = useResumeDraftRuns(draft);
	const resumeId = completedRun?.output?.resumeId;

	if (activeRun) {
		return <ResumePendingCards accessToken={draft.accessToken} userId={draft.userId} variant="stack" />;
	}

	if (resumeId) {
		return (
			<Alert variant="success">
				<CheckCircleIcon weight="duotone" />
				<AlertTitle>Tu CV editable está listo</AlertTitle>
				<AlertDescription>
					<p>Abre el borrador y aplica estas sugerencias dentro del editor.</p>
				</AlertDescription>
				<AlertAction>
					<Button render={<Link params={{ resumeId }} to="/dash/resumes/$resumeId" />} size="sm" variant="ghost">
						Ver documento <CaretCircleRightIcon />
					</Button>
				</AlertAction>
			</Alert>
		);
	}

	if (failedRun) {
		return (
			<Alert variant="warning">
				<WarningCircleIcon weight="duotone" />
				<AlertTitle>No pudimos crear tu CV editable</AlertTitle>
				<AlertDescription>
					<p>Tu análisis sigue disponible, pero el borrador no terminó de generarse.</p>
				</AlertDescription>
				<AlertAction>
					<Button render={<Link to="/dash/resumes" />} size="sm" variant="ghost-muted">
						Ir a CVs <ArrowBendUpRightIcon />
					</Button>
				</AlertAction>
			</Alert>
		);
	}

	return null;
}

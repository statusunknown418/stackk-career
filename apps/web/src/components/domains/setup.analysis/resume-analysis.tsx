import { HashStraightIcon, TriangleDashedIcon } from "@phosphor-icons/react";
import type { EditCategory, EditSeverity, ResumeAnalysis } from "@stackk-career/schemas/ai/resume-analysis";
import type { DeepPartial } from "ai";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

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
	error,
	isStreaming,
}: {
	analysis: DeepPartial<ResumeAnalysis> | undefined;
	error: Error | undefined;
	isStreaming: boolean;
}) {
	const partial = analysis;
	const showLoaders = !error && isStreaming;

	return (
		<Frame className="h-full max-h-[85svh]">
			<FrameHeader>
				<FrameTitle className="font-light text-xl tracking-tight">Análisis de tu CV</FrameTitle>
				<FrameDescription>
					{error && "Error"}
					{!error && isStreaming && "Analizando…"}
					{!(error || isStreaming) && partial && "Listo"}
					{!(error || isStreaming || partial) && "Esperando CV"}
				</FrameDescription>
			</FrameHeader>

			{(partial || showLoaders) && (
				<FramePanel className="flex gap-4">
					<ScoreGauge value={partial?.scoreOverall} />

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
				<FramePanel>
					<Alert variant="error">
						<TriangleDashedIcon />
						<AlertTitle>No pudimos completar el análisis</AlertTitle>
						<AlertDescription>{error.message}</AlertDescription>
					</Alert>
				</FramePanel>
			)}
		</Frame>
	);
}

function ScoreGauge({ value }: { value: number | undefined }) {
	const hasValue = typeof value === "number";
	const clamped = hasValue ? Math.max(0, Math.min(100, value)) : 0;
	const radius = 52;
	const circumference = 2 * Math.PI * radius;
	const offset = hasValue ? circumference * (1 - clamped / 100) : circumference;

	return (
		<div className="relative flex size-32 shrink-0 items-center justify-center">
			<svg
				aria-hidden
				className="size-32 -rotate-90"
				role="img"
				viewBox="0 0 120 120"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Puntuación general del CV</title>
				<circle cx="60" cy="60" fill="none" r={radius} strokeWidth="10" style={{ stroke: "var(--color-muted)" }} />
				<circle
					cx="60"
					cy="60"
					fill="none"
					r={radius}
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					strokeWidth="10"
					style={{
						stroke: "var(--color-success)",
						transition: "stroke-dashoffset 500ms ease-out",
					}}
				/>
			</svg>
			<div className="absolute flex flex-col items-center">
				<span className="font-light text-3xl tabular-nums">{hasValue ? clamped : "—"}</span>
				<span className="text-muted-foreground text-xs">/ 100</span>
			</div>
		</div>
	);
}

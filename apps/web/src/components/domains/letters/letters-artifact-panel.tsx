import { HandWavingIcon, ParagraphIcon, PenNibIcon, SealIcon, TriangleDashedIcon } from "@phosphor-icons/react";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { DeepPartial } from "ai";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { CoverLetterSection } from "./cover-letter-section";

interface LettersArtifactPanelProps {
	artifact: DeepPartial<CoverLetter> | undefined;
	className?: string;
	error?: Error;
	isStreaming: boolean;
}

const SECTION_DEFS = [
	{ icon: HandWavingIcon, key: "greeting", label: "Saludo" },
	{ icon: ParagraphIcon, key: "body", label: "Cuerpo" },
	{ icon: PenNibIcon, key: "closing", label: "Cierre" },
	{ icon: SealIcon, key: "signature", label: "Firma" },
] as const;

/**
 * Right pane of /dash/letters/$generationId — renders the cover-letter artifact.
 *
 * Mirrors the visual language of the CV-analysis panels (setup.analysis/resume-analysis.tsx
 * and resume-editor/resume-analysis-panel.tsx): a `Frame` with status badge in the header,
 * `Shimmer` for active streaming, `Skeleton` for unstarted sections, `Alert` for errors.
 * Inherits the app's neutral palette (bg-background / bg-card) — no landing tokens.
 */
export function LettersArtifactPanel({ artifact, className, error, isStreaming }: LettersArtifactPanelProps) {
	const showLoaders = !error && isStreaming;
	const hasContent = Boolean(artifact);

	return (
		<Frame className={className ?? "h-full max-h-[85svh]"}>
			<FrameHeader>
				<FrameTitle className="font-light text-xl tracking-tight">Tu carta de presentación</FrameTitle>
				<FrameDescription>
					{error && <Badge variant="secondary">Error</Badge>}
					{!error && isStreaming && (
						<Badge variant="secondary">
							<Shimmer>CASEY redactando…</Shimmer>
						</Badge>
					)}
					{!(error || isStreaming) && hasContent && <Badge variant="secondary">Listo</Badge>}
					{!(error || isStreaming || hasContent) && <Badge variant="secondary">Esperando datos</Badge>}
				</FrameDescription>
			</FrameHeader>

			{(hasContent || showLoaders) && (
				<FramePanel className="flex flex-1 flex-col gap-3 overflow-y-auto">
					{SECTION_DEFS.map((def) => {
						const text = artifact?.[def.key];
						return (
							<CoverLetterSection
								icon={def.icon}
								isStreaming={isStreaming && !text}
								key={def.key}
								label={def.label}
								showSkeleton={showLoaders && !text}
								text={typeof text === "string" ? text : undefined}
							/>
						);
					})}
				</FramePanel>
			)}

			{error && (
				<Alert className="mt-4" variant="error">
					<TriangleDashedIcon />
					<AlertTitle>No pudimos completar la carta</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			)}
		</Frame>
	);
}

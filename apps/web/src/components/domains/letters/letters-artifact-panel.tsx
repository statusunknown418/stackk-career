"use client";

import {
	ArrowsClockwiseIcon,
	CopyIcon,
	DownloadSimpleIcon,
	HandWavingIcon,
	ParagraphIcon,
	PenNibIcon,
	SealIcon,
	TriangleDashedIcon,
} from "@phosphor-icons/react";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { MAX_COVER_LETTER_VERSIONS } from "@stackk-career/schemas/api/letters";
import type { DeepPartial } from "ai";
import { jsPDF } from "jspdf";
import { useState } from "react";
import { toast } from "sonner";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CoverLetterSection } from "./cover-letter-section";

interface LettersArtifactPanelProps {
	activeVersion: number;
	artifact: DeepPartial<CoverLetter> | undefined;
	className?: string;
	currentLanguage: CoverLetterLanguage;
	error?: Error;
	generationCount: number;
	hasContent: boolean;
	isPending: boolean;
	isStreaming: boolean;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
}

const SECTION_DEFS = [
	{ icon: HandWavingIcon, key: "greeting", label: "Saludo" },
	{ icon: ParagraphIcon, key: "body", label: "Cuerpo" },
	{ icon: PenNibIcon, key: "closing", label: "Cierre" },
	{ icon: SealIcon, key: "signature", label: "Firma" },
] as const;

interface RegeneratePreset {
	description: string;
	extraPrompt: string | undefined;
	label: string;
	/** Si está seteado, también persiste el cambio de idioma en la generation. */
	language?: CoverLetterLanguage;
	/** Si está seteado, el preset solo aparece cuando la carta actual está en este idioma. */
	onlyIfCurrentLanguage?: CoverLetterLanguage;
}

const REGENERATE_PRESETS: readonly RegeneratePreset[] = [
	{
		description: "Misma carta, otra pasada del modelo.",
		extraPrompt: undefined,
		label: "Sin cambios",
	},
	{
		description: "Más respetuosa, sin informalidades.",
		extraPrompt: "Hacé la carta más formal y respetuosa. Quitá cualquier informalidad o coloquialismo.",
		label: "Más formal",
	},
	{
		description: "Métricas y resultados específicos del CV.",
		extraPrompt:
			"Hacé la carta más concreta. Citá métricas, stacks o resultados específicos del CV en cada párrafo del cuerpo.",
		label: "Más concreta",
	},
	{
		description: "Tono más cercano sin perder profesionalismo.",
		extraPrompt: "Hacé la carta más cálida y personal sin perder profesionalismo. Suaviza el cuerpo y el cierre.",
		label: "Más cálida",
	},
	// Switch idioma. Solo muestra el del idioma opuesto al actual; el preset persiste
	// el switch en generations.language Y dispara el run, así el modelo arranca con el
	// system prompt del nuevo idioma (extraPrompt solo no alcanza — el system prompt
	// gana sobre instrucciones del user message en Claude).
	{
		description: "Cambia el idioma del thread a inglés.",
		extraPrompt: "Reescribí la carta completa en inglés (American English) manteniendo el mismo contenido.",
		label: "En inglés",
		language: "en",
		onlyIfCurrentLanguage: "es",
	},
	{
		description: "Cambia el idioma del thread a español.",
		extraPrompt: "Reescribí la carta completa en español (LATAM neutro) manteniendo el mismo contenido.",
		label: "En español",
		language: "es",
		onlyIfCurrentLanguage: "en",
	},
] as const;

/**
 * Serialize the (possibly partial) cover letter to plain text for the clipboard Copy
 * button. Returns null si alguna sección falta o todavía es un chunk incompleto — el
 * caller usa eso para deshabilitar Copy/Download mientras streamea. (El Download genera
 * un PDF con jsPDF a partir del mismo artifact, no un .txt.)
 */
function formatCoverLetterAsText(artifact: DeepPartial<CoverLetter> | undefined): string | null {
	if (!artifact) {
		return null;
	}
	const { greeting, body, closing, signature } = artifact;
	if (typeof greeting !== "string" || !greeting) {
		return null;
	}
	if (typeof body !== "string" || !body) {
		return null;
	}
	if (typeof closing !== "string" || !closing) {
		return null;
	}
	if (typeof signature !== "string" || !signature) {
		return null;
	}
	return `${greeting}\n\n${body}\n\n${closing}\n\n${signature}\n`;
}

/**
 * Right pane of /dash/letters/$generationId — renders the cover-letter artifact.
 *
 * Mirrors the visual language of the CV-analysis panels (setup.analysis/resume-analysis.tsx
 * and resume-editor/resume-analysis-panel.tsx): a `Frame` with status badge in the header,
 * `Shimmer` for active streaming, `Skeleton` for unstarted sections, `Alert` for errors.
 * Inherits the app's neutral palette (bg-background / bg-card) — no landing tokens.
 *
 * Header buttons (top-right):
 *   - Copy (clipboard, texto plano) — disabled mientras streamea o la carta está incompleta.
 *   - Download (PDF vía jsPDF) — idem.
 *   - "Regenerar" — popover con presets de tono que firen un nuevo run.
 */
export function LettersArtifactPanel({
	activeVersion,
	artifact,
	className,
	currentLanguage,
	error,
	generationCount,
	hasContent,
	isPending,
	isStreaming,
	onTriggerAsync,
}: LettersArtifactPanelProps) {
	const showLoaders = !error && isStreaming;
	const hasStreamedContent = Boolean(artifact);
	const canRegenerate = hasContent && !(isPending || isStreaming);
	const formattedText = formatCoverLetterAsText(artifact);
	const canExport = Boolean(formattedText) && !isStreaming;
	const [popoverOpen, setPopoverOpen] = useState(false);

	const visiblePresets = REGENERATE_PRESETS.filter(
		(p) => !p.onlyIfCurrentLanguage || p.onlyIfCurrentLanguage === currentLanguage
	);

	const handleRegenerate = async (preset: RegeneratePreset) => {
		setPopoverOpen(false);
		try {
			await onTriggerAsync({ extraPrompt: preset.extraPrompt, language: preset.language });
		} catch {
			// Toast emitido por la route.
		}
	};

	const handleCopy = async () => {
		if (!formattedText) {
			return;
		}
		try {
			await navigator.clipboard.writeText(formattedText);
			toast.success("Carta copiada al portapapeles");
		} catch {
			toast.error("No pudimos copiar al portapapeles");
		}
	};

	const handleDownload = () => {
		if (!artifact) {
			return;
		}
		const { greeting, body, closing, signature } = artifact;
		if (
			typeof greeting !== "string" ||
			typeof body !== "string" ||
			typeof closing !== "string" ||
			typeof signature !== "string"
		) {
			return;
		}

		try {
			const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

			const pageHeight = 297;
			const margin = 25;
			const contentWidth = 210 - margin * 2;
			const lineHeight = 5;
			const maxY = pageHeight - margin;

			doc.setFontSize(11);
			let cursorY = margin;

			// Pagina LÍNEA por línea: agrega página cuando la próxima línea se pasaría del
			// margen inferior. jsPDF no pagina dentro de un solo text(), así que escribir el
			// párrafo entero de una recortaba cualquier párrafo más alto que una página.
			const splitToLines = (value: string): string[] => {
				const lines = doc.splitTextToSize(value, contentWidth);
				return Array.isArray(lines) ? lines : [lines];
			};
			const writeBlock = (value: string, gapAfter: number) => {
				for (const line of splitToLines(value)) {
					if (cursorY + lineHeight > maxY) {
						doc.addPage();
						cursorY = margin;
					}
					doc.text(line, margin, cursorY);
					cursorY += lineHeight;
				}
				cursorY += gapAfter;
			};

			// Saludo (bold)
			doc.setFont("helvetica", "bold");
			writeBlock(greeting, 8);

			// Cuerpo (normal), párrafo por párrafo
			doc.setFont("helvetica", "normal");
			for (const p of body.split("\n\n")) {
				const trimmed = p.trim();
				if (trimmed) {
					writeBlock(trimmed, 6);
				}
			}

			// Cierre
			cursorY += 4;
			writeBlock(closing, 8);

			// Firma (bold)
			doc.setFont("helvetica", "bold");
			writeBlock(signature, 0);

			doc.save("carta-de-presentacion.pdf");
			toast.success("Carta descargada como PDF");
		} catch {
			toast.error("No se pudo generar el PDF");
		}
	};

	return (
		<Frame className={className ?? "h-full max-h-[85svh]"}>
			<FrameHeader className="flex-row items-start justify-between gap-3">
				<div className="flex flex-col gap-1.5">
					<FrameTitle className="font-light text-xl tracking-tight">Tu carta de presentación</FrameTitle>
					<FrameDescription>
						{error && <Badge variant="secondary">Error</Badge>}
						{!error && isStreaming && (
							<Badge variant="secondary">
								<Shimmer>CASEY redactando…</Shimmer>
							</Badge>
						)}
						{!(error || isStreaming) && hasContent && (
							<Badge variant="secondary">
								Versión {activeVersion}/{MAX_COVER_LETTER_VERSIONS}
							</Badge>
						)}
						{!(error || isStreaming || hasContent) && <Badge variant="secondary">Esperando datos</Badge>}
					</FrameDescription>
				</div>

				{hasContent && (
					<div className="flex items-center gap-1.5">
						<Button
							aria-label="Copiar al portapapeles"
							disabled={!canExport}
							onClick={handleCopy}
							size="icon-sm"
							type="button"
							variant="outline"
						>
							<CopyIcon weight="bold" />
						</Button>

						<Button
							aria-label="Descargar como PDF"
							disabled={!canExport}
							onClick={handleDownload}
							size="icon-sm"
							type="button"
							variant="outline"
						>
							<DownloadSimpleIcon weight="bold" />
						</Button>

						<Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
							<PopoverTrigger
								render={
									<Button
										aria-label="Regenerar carta"
										disabled={!canRegenerate}
										onClick={(e) => {
											// En el límite no abrimos el popover de presets: cancelamos la apertura y
											// disparamos onTriggerAsync sin preset, que detecta el tope y muestra el
											// diálogo de límite (única vía que tiene el panel para señalarlo).
											if (generationCount >= MAX_COVER_LETTER_VERSIONS) {
												e.preventDefault();
												e.stopPropagation();
												onTriggerAsync({});
											}
										}}
										size="sm"
										type="button"
										variant="outline"
									>
										<ArrowsClockwiseIcon className={cn((isPending || isStreaming) && "animate-spin")} weight="bold" />
										Regenerar
									</Button>
								}
							/>
							<PopoverPopup align="end" className="w-72">
								<div className="flex flex-col gap-1">
									<p className="px-2 pt-1 pb-2 font-medium text-xs uppercase tracking-wide">Tono</p>
									{visiblePresets.map((preset) => (
										<button
											className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
											disabled={!canRegenerate}
											key={preset.label}
											onClick={() => handleRegenerate(preset)}
											type="button"
										>
											<span className="font-medium">{preset.label}</span>
											<span className="text-muted-foreground text-xs">{preset.description}</span>
										</button>
									))}
								</div>
							</PopoverPopup>
						</Popover>
					</div>
				)}
			</FrameHeader>

			{(hasStreamedContent || showLoaders) && (
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

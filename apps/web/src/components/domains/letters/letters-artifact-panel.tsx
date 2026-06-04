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
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { InlineTextEditor } from "@/components/domains/resume-document/inline-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CoverLetterSection, LetterSectionShell, SECTION_SKELETON_LINES } from "./cover-letter-section";

interface LettersArtifactPanelProps {
	/** Id del artifact-message actualmente mostrado (al que se guardan las ediciones). */
	activeMessageId: string | null;
	activeVersion: number;
	artifact: DeepPartial<CoverLetter> | undefined;
	className?: string;
	currentLanguage: CoverLetterLanguage;
	error?: Error;
	generationCount: number;
	hasContent: boolean;
	isPending: boolean;
	isStreaming: boolean;
	/** Persiste ediciones manuales del usuario sobre la carta mostrada (no es una regeneración). */
	onSaveArtifact: (messageId: string, artifact: CoverLetter) => Promise<unknown>;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
}

const EMPTY_SECTION_MESSAGE = "Ninguna sección puede quedar vacía.";

// Ease-out exponencial para el cross-fade del cuerpo (carta editable ↔ vista de streaming):
// entra rápido, asienta suave, sin rebote. Solo opacity, nunca propiedades de layout.
const PANEL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PANEL_FADE_DURATION = 0.22;

// El cuerpo de la carta puede venir como texto plano (lo que escribe CASEY) o como
// HTML (cuando el usuario lo editó con el editor enriquecido TipTap). Estos helpers
// normalizan en ambos sentidos — el schema sigue siendo un único `string`.
// Detecta SOLO los tags que el editor TipTap (StarterKit prose) emite — no cualquier `<token>`.
// Así un texto plano como `Promise<T>`, `<empresa>` o `<a@b.com>` NO se confunde con HTML: se
// escapa bien y no se pierde al renderizar / copiar / exportar a PDF.
const HTML_TAG_RE = /<\/?(?:p|br|strong|em|ul|ol|li)(?:>|\s|\/)/i;
const BR_RE = /<br\s*\/?>/gi;
const BLOCK_CLOSE_RE = /<\/(?:p|div|li)>/gi;
const ANY_TAG_RE = /<[^>]+>/g;
const MULTI_NEWLINE_RE = /\n{3,}/g;
const PARAGRAPH_SPLIT_RE = /\n{2,}/;

const isHtmlBody = (value: string): boolean => HTML_TAG_RE.test(value);

const escapeHtml = (value: string): string =>
	value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Texto plano (párrafos separados por `\n\n`) → HTML `<p>…</p>`. Si ya es HTML, lo deja igual. */
function bodyToHtml(value: string): string {
	if (isHtmlBody(value)) {
		return value;
	}
	return value
		.split(PARAGRAPH_SPLIT_RE)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean)
		.map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
		.join("");
}

/** HTML del editor → texto plano (para PDF / copiar / validar vacío). Si ya es plano, lo deja igual. */
function htmlToText(value: string): string {
	if (!isHtmlBody(value)) {
		return value;
	}
	return value
		.replace(BR_RE, "\n")
		.replace(BLOCK_CLOSE_RE, "\n\n")
		.replace(ANY_TAG_RE, "")
		.replaceAll("&nbsp;", " ")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&")
		.replace(MULTI_NEWLINE_RE, "\n\n")
		.trim();
}

/** Extrae el artifact completo (4 secciones string) para editar, o null si está incompleto. */
function toCompleteCoverLetter(artifact: DeepPartial<CoverLetter> | undefined): CoverLetter | null {
	if (!artifact) {
		return null;
	}
	const { greeting, body, closing, signature } = artifact;
	if (
		typeof greeting !== "string" ||
		typeof body !== "string" ||
		typeof closing !== "string" ||
		typeof signature !== "string"
	) {
		return null;
	}
	return { greeting, body, closing, signature };
}

/**
 * Genera y descarga el PDF de la carta, paginando LÍNEA por línea (jsPDF no pagina dentro de
 * un solo text(), así que escribir el párrafo entero recortaba párrafos más altos que la página).
 * A nivel de módulo para mantener baja la complejidad cognitiva del componente.
 */
function downloadCoverLetterPdf(letter: CoverLetter) {
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const pageHeight = 297;
	const margin = 25;
	const contentWidth = 210 - margin * 2;
	const lineHeight = 5;
	const maxY = pageHeight - margin;

	doc.setFontSize(11);
	let cursorY = margin;

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

	doc.setFont("helvetica", "bold");
	writeBlock(htmlToText(letter.greeting), 8);

	doc.setFont("helvetica", "normal");
	for (const p of htmlToText(letter.body).split("\n\n")) {
		const trimmed = p.trim();
		if (trimmed) {
			writeBlock(trimmed, 6);
		}
	}

	cursorY += 4;
	writeBlock(htmlToText(letter.closing), 8);

	doc.setFont("helvetica", "bold");
	writeBlock(htmlToText(letter.signature), 0);

	doc.save("carta-de-presentacion.pdf");
}

const allSectionsFilled = (letter: CoverLetter): boolean =>
	Boolean(
		htmlToText(letter.greeting).trim() &&
			htmlToText(letter.body).trim() &&
			htmlToText(letter.closing).trim() &&
			htmlToText(letter.signature).trim()
	);

// `primary` = la sección dominante (el cuerpo): se muestra como Card prominente; el resto (saludo,
// cierre, firma) son filas planas compactas, dándole jerarquía a la carta.
const SECTION_DEFS = [
	{ icon: HandWavingIcon, key: "greeting", label: "Saludo", primary: false },
	{ icon: ParagraphIcon, key: "body", label: "Cuerpo", primary: true },
	{ icon: PenNibIcon, key: "closing", label: "Cierre", primary: false },
	{ icon: SealIcon, key: "signature", label: "Firma", primary: false },
] as const;

/**
 * Carta editable EN SITIO: cada sección es un editor TipTap (prose) sobre el que el usuario
 * escribe directamente — sin botón de "editar" ni modo aparte. Al salir de un campo (blur) se
 * autoguarda vía `onSaveArtifact` solo si hubo cambios. El componente se monta con `key =
 * activeMessageId`, así que cambiar de versión lo re-crea con el contenido correcto y un guardado
 * (misma versión) no lo resetea.
 */
function EditableLetter({
	activeMessageId,
	letter,
	onSaveArtifact,
}: {
	activeMessageId: string;
	letter: CoverLetter;
	onSaveArtifact: (messageId: string, artifact: CoverLetter) => Promise<unknown>;
}) {
	const [draft, setDraft] = useState<CoverLetter>(letter);
	const dirtyRef = useRef(false);
	const [saving, setSaving] = useState(false);

	const setField = (key: keyof CoverLetter, value: string) => {
		dirtyRef.current = true;
		setDraft((prev) => ({ ...prev, [key]: value }));
	};

	const commit = async () => {
		if (!dirtyRef.current || saving) {
			return;
		}
		const trimmed: CoverLetter = {
			greeting: draft.greeting.trim(),
			body: draft.body.trim(),
			closing: draft.closing.trim(),
			signature: draft.signature.trim(),
		};
		if (!allSectionsFilled(trimmed)) {
			toast.error(EMPTY_SECTION_MESSAGE);
			return;
		}
		dirtyRef.current = false;
		setSaving(true);
		try {
			await onSaveArtifact(activeMessageId, trimmed);
		} catch {
			dirtyRef.current = true; // Reintenta en el próximo blur. El toast lo emite la route.
		} finally {
			setSaving(false);
		}
	};

	return (
		<FramePanel className="flex flex-1 flex-col overflow-y-auto">
			<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3">
				<p className="px-1 text-muted-foreground text-xs">
					Edita cualquier sección directamente; se guarda solo
					{saving ? <span className="text-foreground/70"> · Guardando…</span> : null}
				</p>
				{SECTION_DEFS.map((def) => (
					<LetterSectionShell icon={def.icon} isStreaming={false} key={def.key} label={def.label} primary={def.primary}>
						<InlineTextEditor
							onBlur={commit}
							onChange={(value) => setField(def.key, value)}
							placeholder={`${def.label}…`}
							value={bodyToHtml(draft[def.key])}
							variant="prose"
						/>
					</LetterSectionShell>
				))}
			</div>
		</FramePanel>
	);
}

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
		description: "Más respetuosa, sin informalidades.",
		extraPrompt: "Haz la carta más formal y respetuosa. Quita cualquier informalidad o coloquialismo.",
		label: "Más formal",
	},
	{
		description: "Métricas y resultados específicos del CV.",
		extraPrompt:
			"Haz la carta más concreta. Cita métricas, stacks o resultados específicos del CV en cada párrafo del cuerpo.",
		label: "Más concreta",
	},
	{
		description: "Tono más cercano sin perder profesionalismo.",
		extraPrompt: "Haz la carta más cálida y personal sin perder profesionalismo. Suaviza el cuerpo y el cierre.",
		label: "Más cálida",
	},
	// Switch idioma. Solo muestra el del idioma opuesto al actual; el preset persiste
	// el switch en generations.language Y dispara el run, así el modelo arranca con el
	// system prompt del nuevo idioma (extraPrompt solo no alcanza — el system prompt
	// gana sobre instrucciones del user message en Claude).
	{
		description: "Cambia el idioma del thread a inglés.",
		extraPrompt: "Reescribe la carta completa en inglés (American English) manteniendo el mismo contenido.",
		label: "En inglés",
		language: "en",
		onlyIfCurrentLanguage: "es",
	},
	{
		description: "Cambia el idioma del thread a español.",
		extraPrompt: "Reescribe la carta completa en español (peruano neutro profesional) manteniendo el mismo contenido.",
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
	return `${htmlToText(greeting)}\n\n${htmlToText(body)}\n\n${htmlToText(closing)}\n\n${htmlToText(signature)}\n`;
}

interface ArtifactToolbarProps {
	canExport: boolean;
	canRegenerate: boolean;
	generationCount: number;
	handleCopy: () => void | Promise<void>;
	handleDownload: () => void;
	handleRegenerate: (preset: RegeneratePreset) => void | Promise<void>;
	hasContent: boolean;
	isPending: boolean;
	isStreaming: boolean;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
	popoverOpen: boolean;
	setPopoverOpen: (open: boolean) => void;
	visiblePresets: readonly RegeneratePreset[];
}

/** Botonera del header: Copiar / Descargar PDF / Regenerar. (La edición es inline, no hay botón.) */
function ArtifactToolbar(props: ArtifactToolbarProps) {
	if (!props.hasContent) {
		return null;
	}
	return (
		<div className="flex items-center gap-1.5">
			<Button
				aria-label="Copiar al portapapeles"
				disabled={!props.canExport}
				onClick={props.handleCopy}
				size="icon-sm"
				type="button"
				variant="outline"
			>
				<CopyIcon weight="bold" />
			</Button>
			<Button
				aria-label="Descargar como PDF"
				disabled={!props.canExport}
				onClick={props.handleDownload}
				size="icon-sm"
				type="button"
				variant="outline"
			>
				<DownloadSimpleIcon weight="bold" />
			</Button>
			<Popover onOpenChange={props.setPopoverOpen} open={props.popoverOpen}>
				<PopoverTrigger
					render={
						<Button
							aria-label="Regenerar carta"
							disabled={!props.canRegenerate}
							onClick={(e) => {
								// En el límite no abrimos el popover: disparamos onTriggerAsync sin preset,
								// que detecta el tope y muestra el diálogo de límite.
								if (props.generationCount >= MAX_COVER_LETTER_VERSIONS) {
									e.preventDefault();
									e.stopPropagation();
									props.onTriggerAsync({});
								}
							}}
							size="sm"
							type="button"
							variant="outline"
						>
							<ArrowsClockwiseIcon
								className={cn((props.isPending || props.isStreaming) && "animate-spin")}
								weight="bold"
							/>
							Regenerar
						</Button>
					}
				/>
				<PopoverPopup align="end" className="w-72">
					<div className="flex flex-col gap-1">
						<p className="px-2 pt-1 pb-2 font-medium text-xs uppercase tracking-wide">Tono</p>
						{props.visiblePresets.map((preset) => (
							<button
								className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
								disabled={!props.canRegenerate}
								key={preset.label}
								onClick={() => props.handleRegenerate(preset)}
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
	);
}

/** Vista de solo lectura de la carta: durante el streaming de CASEY o para mostrarla sin editar. */
function ReadOnlyLetter({
	artifact,
	isStreaming,
	preparing,
	showLoaders,
}: {
	artifact: DeepPartial<CoverLetter> | undefined;
	isStreaming: boolean;
	/** Generando pero aún sin contenido: mostramos un mensaje cálido encima del skeleton. */
	preparing: boolean;
	showLoaders: boolean;
}) {
	// La sección "activa" (la que CASEY está escribiendo) = la última con contenido; las que vienen
	// después aún no empezaron. Solo la activa muestra "redactando…"; las pendientes, solo skeleton.
	const activeIndex = SECTION_DEFS.reduce((acc, def, i) => {
		const v = artifact?.[def.key];
		return typeof v === "string" && v.trim() ? i : acc;
	}, 0);

	return (
		<FramePanel className="flex flex-1 flex-col overflow-y-auto">
			<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3">
				{preparing && (
					<p className="px-1 text-muted-foreground text-sm">
						<Shimmer>CASEY está leyendo tu CV y redactando tu carta…</Shimmer>
					</p>
				)}
				{SECTION_DEFS.map((def, i) => {
					const value = artifact?.[def.key];
					const text = typeof value === "string" ? value : undefined;
					// Cualquier sección puede haber quedado como HTML tras una edición → la normalizamos
					// para mostrarla con su formato.
					const richHtml = text ? bodyToHtml(text) : undefined;
					return (
						<CoverLetterSection
							icon={def.icon}
							isStreaming={isStreaming && i === activeIndex}
							key={def.key}
							label={def.label}
							primary={def.primary}
							richHtml={richHtml}
							showSkeleton={showLoaders && !text}
							skeletonLines={SECTION_SKELETON_LINES[def.key]}
						/>
					);
				})}
			</div>
		</FramePanel>
	);
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
	activeMessageId,
	activeVersion,
	artifact,
	className,
	currentLanguage,
	error,
	generationCount,
	hasContent,
	isPending,
	isStreaming,
	onSaveArtifact,
	onTriggerAsync,
}: LettersArtifactPanelProps) {
	// Skeletons durante TODO el generado (incluida la ventana previa al stream, mientras CASEY lee
	// el CV), no solo en streaming — así no hay un hueco frío entre "disparé" y "primer chunk".
	const showLoaders = !error && isPending;
	const hasStreamedContent = Boolean(artifact);
	// Generando pero todavía sin contenido nuevo (primer draft o el gap antes del primer chunk):
	// mostramos el mensaje cálido. En una regeneración con carta previa, `artifact` aún tiene la
	// anterior, así que `preparing` es false y se ve la carta vieja hasta que arranca el stream.
	const preparing = showLoaders && !hasStreamedContent;
	const canRegenerate = hasContent && !isPending;
	const formattedText = formatCoverLetterAsText(artifact);
	const canExport = Boolean(formattedText) && !isPending;
	const [popoverOpen, setPopoverOpen] = useState(false);

	const reduceMotion = useReducedMotion();
	const panelTransition = { duration: reduceMotion ? 0 : PANEL_FADE_DURATION, ease: PANEL_EASE };

	// La carta completa actual (las 4 secciones presentes). Si está y NO estamos generando
	// (ni streameando ni con un trigger recién disparado), se muestra editable EN SITIO: cada
	// sección es un editor y se autoguarda al salir del campo (no consume versión; persiste vía
	// onSaveArtifact). El `!isPending` evita re-montar el editor en la ventana previa al stream.
	const completeLetter = toCompleteCoverLetter(artifact);
	const canEditInline = Boolean(completeLetter) && !isPending && Boolean(activeMessageId);

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
		const letter = toCompleteCoverLetter(artifact);
		if (!letter) {
			return;
		}
		try {
			downloadCoverLetterPdf(letter);
			toast.success("Carta descargada como PDF");
		} catch {
			toast.error("No se pudo generar el PDF");
		}
	};

	// Cuerpo con cross-fade: al pasar de la carta editable a la vista de streaming (y viceversa)
	// el contenido NO se reemplaza de golpe — la vista saliente se desvanece y la entrante aparece
	// con un fade. El `key` por modo deja que AnimatePresence (mode="wait") orqueste el dissolve.
	let body: ReactNode = null;
	if (canEditInline && completeLetter && activeMessageId) {
		body = (
			<motion.div
				animate={{ opacity: 1 }}
				className="flex min-h-0 flex-1 flex-col"
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				key="editable"
				transition={panelTransition}
			>
				<EditableLetter
					activeMessageId={activeMessageId}
					key={activeMessageId}
					letter={completeLetter}
					onSaveArtifact={onSaveArtifact}
				/>
			</motion.div>
		);
	} else if (hasStreamedContent || showLoaders) {
		body = (
			<motion.div
				animate={{ opacity: 1 }}
				className="flex min-h-0 flex-1 flex-col"
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				key="readonly"
				transition={panelTransition}
			>
				<ReadOnlyLetter artifact={artifact} isStreaming={isStreaming} preparing={preparing} showLoaders={showLoaders} />
			</motion.div>
		);
	}

	return (
		<Frame className={className ?? "h-full min-h-0"}>
			<FrameHeader className="flex-row items-start justify-between gap-3">
				<div className="flex flex-col gap-1.5">
					<FrameDescription>
						{error && <Badge variant="secondary">Error</Badge>}
						{!error && isPending && (
							<Badge variant="secondary">
								<Shimmer>CASEY redactando…</Shimmer>
							</Badge>
						)}
						{!(error || isPending) && hasContent && (
							<Badge variant="secondary">
								Versión {activeVersion}/{MAX_COVER_LETTER_VERSIONS}
							</Badge>
						)}
						{!(error || isPending || hasContent) && <Badge variant="secondary">Lista para empezar</Badge>}
					</FrameDescription>
				</div>

				<ArtifactToolbar
					canExport={canExport}
					canRegenerate={canRegenerate}
					generationCount={generationCount}
					handleCopy={handleCopy}
					handleDownload={handleDownload}
					handleRegenerate={handleRegenerate}
					hasContent={hasContent}
					isPending={isPending}
					isStreaming={isStreaming}
					onTriggerAsync={onTriggerAsync}
					popoverOpen={popoverOpen}
					setPopoverOpen={setPopoverOpen}
					visiblePresets={visiblePresets}
				/>
			</FrameHeader>

			<AnimatePresence initial={false} mode="popLayout">
				{body}
			</AnimatePresence>

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

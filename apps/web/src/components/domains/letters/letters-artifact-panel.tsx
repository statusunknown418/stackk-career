"use client";

import {
	ArrowsClockwiseIcon,
	ChartBarIcon,
	CopyIcon,
	DownloadSimpleIcon,
	HandWavingIcon,
	HeartIcon,
	type Icon,
	ParagraphIcon,
	PenNibIcon,
	SealIcon,
	SuitcaseSimpleIcon,
	TranslateIcon,
	TriangleDashedIcon,
} from "@phosphor-icons/react";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import type { DeepPartial } from "ai";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CoverLetterSection, type LetterSectionDef, LetterSectionShell } from "./cover-letter-section";
import {
	allSectionsFilled,
	downloadCoverLetterPdf,
	EMPTY_SECTION_MESSAGE,
	formatCoverLetterAsText,
	toCompleteCoverLetter,
} from "./letters-artifact-utils";

/** Snapshot of the letter shown by the panel: content, active version and quota. Built by the route. */
export interface LetterView {
	/** Id of the artifact message currently shown (edits are saved to it). */
	activeMessageId: string | null;
	activeVersion: number;
	artifact: DeepPartial<CoverLetter> | undefined;
	currentLanguage: CoverLetterLanguage;
	generationCount: number;
	hasContent: boolean;
	maxVersions: number;
}

/** State of the in-flight CASEY run (or its error), shared by header, toolbar and body. */
export interface LetterRunState {
	error?: Error;
	isPending: boolean;
	isStreaming: boolean;
}

interface LettersArtifactPanelProps {
	className?: string;
	letter: LetterView;
	/** Persists manual user edits to the shown letter (not a regeneration). */
	onSaveArtifact: (messageId: string, artifact: CoverLetter) => Promise<unknown>;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
	run: LetterRunState;
}

// Exponential ease-out for the body cross-fade (editable letter ↔ streaming view).
// Opacity only, never layout properties.
const PANEL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PANEL_FADE_DURATION = 0.22;

// `primary` = the dominant section (body), shown as a prominent Card; the rest stay compact
// so the letter has hierarchy.
const SECTION_DEFS = [
	{ icon: HandWavingIcon, key: "greeting", label: "Saludo", primary: false },
	{ icon: ParagraphIcon, key: "body", label: "Cuerpo", primary: true },
	{ icon: PenNibIcon, key: "closing", label: "Cierre", primary: false },
	{ icon: SealIcon, key: "signature", label: "Firma", primary: false },
] as const satisfies readonly LetterSectionDef[];

/**
 * In-place editable letter: each section is a TipTap (prose) editor, no separate edit mode.
 * Autosaves on blur via `onSaveArtifact` only when dirty. Mounted with `key = activeMessageId`,
 * so switching versions recreates it with the right content and a same-version save doesn't reset it.
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
			dirtyRef.current = true; // Retry on next blur; the route emits the toast.
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
						<Textarea
							aria-label={def.label}
							className="field-sizing-content w-full resize-none whitespace-pre-line text-sm leading-relaxed outline-none"
							onBlur={commit}
							onChange={(e) => setField(def.key, e.target.value)}
							placeholder={`${def.label}…`}
							rows={def.primary ? 6 : 1}
							unstyled
							value={draft[def.key]}
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
	icon: Icon;
	label: string;
	/** When set, also persists the language switch on the generation. */
	language?: CoverLetterLanguage;
	/** When set, the preset only shows when the current letter is in this language. */
	onlyIfCurrentLanguage?: CoverLetterLanguage;
}

const REGENERATE_PRESETS: readonly RegeneratePreset[] = [
	{
		description: "Más respetuosa, sin informalidades.",
		extraPrompt: "Haz la carta más formal y respetuosa. Quita cualquier informalidad o coloquialismo.",
		icon: SuitcaseSimpleIcon,
		label: "Más formal",
	},
	{
		description: "Métricas y resultados específicos del CV.",
		extraPrompt:
			"Haz la carta más concreta. Cita métricas, stacks o resultados específicos del CV en cada párrafo del cuerpo.",
		icon: ChartBarIcon,
		label: "Más concreta",
	},
	{
		description: "Tono más cercano sin perder profesionalismo.",
		extraPrompt: "Haz la carta más cálida y personal sin perder profesionalismo. Suaviza el cuerpo y el cierre.",
		icon: HeartIcon,
		label: "Más cálida",
	},
	// Language switch presets. Only the opposite language is shown; the preset persists the
	// switch in generations.language AND fires the run so the model starts with the new
	// language's system prompt (extraPrompt alone is not enough — the system prompt wins).
	{
		description: "Traduce esta carta y genera las próximas versiones en inglés.",
		extraPrompt: "Reescribe la carta completa en inglés (American English) manteniendo el mismo contenido.",
		icon: TranslateIcon,
		label: "En inglés",
		language: "en",
		onlyIfCurrentLanguage: "es",
	},
	{
		description: "Traduce esta carta y genera las próximas versiones en español.",
		extraPrompt: "Reescribe la carta completa en español (peruano neutro profesional) manteniendo el mismo contenido.",
		icon: TranslateIcon,
		label: "En español",
		language: "es",
		onlyIfCurrentLanguage: "en",
	},
] as const;

interface ArtifactToolbarProps {
	letter: LetterView;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
	run: LetterRunState;
}

/** Header buttons: copy / download PDF / regenerate. (Editing is inline, no button.) */
function ArtifactToolbar({ letter, onTriggerAsync, run }: ArtifactToolbarProps) {
	const { artifact, currentLanguage, generationCount, hasContent, maxVersions } = letter;
	const [popoverOpen, setPopoverOpen] = useState(false);

	// Presence check only — the actual text conversion happens inside the click handlers
	// (it touches the DOM, which is unavailable during SSR).
	const canExport = toCompleteCoverLetter(artifact) !== null && !run.isPending;
	const canRegenerate = hasContent && !run.isPending;

	const visiblePresets = REGENERATE_PRESETS.filter(
		(p) => !p.onlyIfCurrentLanguage || p.onlyIfCurrentLanguage === currentLanguage
	);

	const handleRegenerate = async (preset: RegeneratePreset) => {
		setPopoverOpen(false);
		try {
			await onTriggerAsync({ extraPrompt: preset.extraPrompt, language: preset.language });
		} catch {
			// Toast already emitted by the route.
		}
	};

	const handleCopy = async () => {
		const formattedText = formatCoverLetterAsText(artifact);
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

	if (!hasContent) {
		return null;
	}
	return (
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
								// At the limit, skip the popover: fire onTriggerAsync without a preset,
								// which detects the cap and shows the limit dialog.
								if (generationCount >= maxVersions) {
									e.preventDefault();
									e.stopPropagation();
									onTriggerAsync({});
								}
							}}
							size="sm"
							type="button"
							variant="outline"
						>
							<ArrowsClockwiseIcon className={cn((run.isPending || run.isStreaming) && "animate-spin")} weight="bold" />
							Regenerar
						</Button>
					}
				/>
				<PopoverPopup align="end" className="w-72">
					<div className="flex flex-col gap-1">
						<p className="px-2 pt-1 pb-2 font-medium text-xs uppercase tracking-wide">Tono</p>
						{visiblePresets.map((preset) => {
							const PresetIcon = preset.icon;
							return (
								<button
									className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
									disabled={!canRegenerate}
									key={preset.label}
									onClick={() => handleRegenerate(preset)}
									type="button"
								>
									<PresetIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" weight="bold" />
									<span className="flex flex-col gap-0.5">
										<span className="font-medium">{preset.label}</span>
										<span className="text-muted-foreground text-xs">{preset.description}</span>
									</span>
								</button>
							);
						})}
					</div>
				</PopoverPopup>
			</Popover>
		</div>
	);
}

/** Read-only letter view: during CASEY streaming or for display without editing. */
function ReadOnlyLetter({
	artifact,
	isStreaming,
	preparing,
	showLoaders,
}: {
	artifact: DeepPartial<CoverLetter> | undefined;
	isStreaming: boolean;
	/** Generating but no content yet: show a friendly message above the skeleton. */
	preparing: boolean;
	showLoaders: boolean;
}) {
	// Active section (the one CASEY is writing) = the last one with content. Only the active
	// one shows "redactando…"; pending ones show only the skeleton.
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
					return (
						<CoverLetterSection
							def={def}
							isStreaming={isStreaming && i === activeIndex}
							key={def.key}
							showSkeleton={showLoaders && !text}
							text={text}
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
 *   - Copy (clipboard, plain text) — disabled while streaming or the letter is incomplete.
 *   - Download (PDF via jsPDF) — same.
 *   - "Regenerar" — popover with tone presets that fire a new run.
 */
export function LettersArtifactPanel({
	className,
	letter,
	onSaveArtifact,
	onTriggerAsync,
	run,
}: LettersArtifactPanelProps) {
	const { activeMessageId, activeVersion, artifact, hasContent, maxVersions } = letter;
	const { error, isPending, isStreaming } = run;
	// Show skeletons for the whole generation (including the pre-stream window while CASEY reads
	// the CV), not just while streaming — no cold gap between trigger and first chunk.
	const showLoaders = !error && isPending;
	const hasStreamedContent = Boolean(artifact);
	// Generating but no new content yet (first draft or pre-first-chunk gap): show the friendly
	// message. On a regeneration `artifact` still holds the previous letter, so `preparing` is
	// false and the old letter stays visible until the stream starts.
	const preparing = showLoaders && !hasStreamedContent;

	const reduceMotion = useReducedMotion();
	const panelTransition = { duration: reduceMotion ? 0 : PANEL_FADE_DURATION, ease: PANEL_EASE };

	// Current complete letter (all 4 sections present). When complete and not generating, it is
	// shown editable in place (autosave on blur, no version consumed). `!isPending` avoids
	// remounting the editor during the pre-stream window.
	const completeLetter = toCompleteCoverLetter(artifact);
	const canEditInline = Boolean(completeLetter) && !isPending && Boolean(activeMessageId);

	// Body cross-fade between editable letter and streaming view. The per-mode `key` lets
	// AnimatePresence orchestrate the dissolve.
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
						{!(error || isPending) && hasContent && (
							<Badge variant="secondary">
								Versión {activeVersion}/{maxVersions}
							</Badge>
						)}
						{!(error || isPending || hasContent) && <Badge variant="secondary">Lista para empezar</Badge>}
					</FrameDescription>
				</div>

				<ArtifactToolbar letter={letter} onTriggerAsync={onTriggerAsync} run={run} />
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

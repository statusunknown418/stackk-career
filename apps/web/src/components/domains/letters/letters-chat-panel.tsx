"use client";

import {
	ArrowSquareOutIcon,
	CursorClickIcon,
	EyeIcon,
	FileTextIcon,
	IdentificationCardIcon,
	PaperPlaneRightIcon,
	PencilSimpleIcon,
	QuestionIcon,
	ReadCvLogoIcon,
	TargetIcon,
	WarningCircleIcon,
	WrenchIcon,
} from "@phosphor-icons/react";
import { COVER_LETTER_OBJECT_TYPE } from "@stackk-career/schemas/ai/cover-letter";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { InlineTextEditor } from "@/components/domains/resume-document/inline-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface LettersChatPanelMessage {
	error: string | null;
	id: string;
	isAssistant: boolean | null;
	isTool: boolean | null;
	objectType: string | null;
	text: string | null;
	toolMeta: { toolId: string; toolName: string } | null;
}

interface LettersChatPanelProps {
	isPending: boolean;
	jobContextSource: "manual" | "resume-job-target";
	jobPosition: string;
	maxVersions: number;
	messages: readonly LettersChatPanelMessage[];
	onOpenJobContext: () => void;
	onSaveTitle: (title: string) => void;
	onSelectVersion: (messageId: string) => void;
	onStartTour?: () => void;
	onTriggerAsync: (input: { extraPrompt?: string }) => Promise<unknown>;
	resumeTitle: string | null;
	selectedMessageId: string | null;
}

interface ToolPresentation {
	Icon: ComponentType<{ className?: string; weight?: "duotone" }>;
	label: string;
}

/**
 * Chat panel chrome — ALWAYS in Spanish (the app's UI language). The letter language (es/en)
 * affects ONLY the artifact content; localizing this chrome would be inconsistent with the app.
 */
const CHAT_COPY = {
	howItWorks: "Cómo funciona",
	introPrefix: "Voy a redactar tu carta para",
	introResume: "usando el CV",
	viewTarget: "Ver oferta",
	viewManualTarget: "Ver contexto",
	contextLabel: "Alineada a",
	titlePlaceholder: "Puesto al que postulas",
	versionsTip:
		"💡 Puedes hacer clic en las versiones generadas en el chat para ver su contenido en el panel de la derecha.",
	version: "Versión",
	viewing: "Visualizando",
	clickToLoad: "Haz clic para cargar",
	failed: "Esta versión falló",
	fieldLabel: "Indicación adicional",
	placeholder: "Ej. Tono más cálido. Menciona que tengo experiencia en fintech.",
	generating: "Generando…",
	generate: "Generar carta",
	toolReadCv: "CASEY leyó tu CV",
	toolReadProfile: "CASEY revisó tu perfil",
	toolGeneric: "CASEY consultó una herramienta",
} as const;

type ChatCopy = typeof CHAT_COPY;

function toolPresentation(toolName: string | undefined, copy: ChatCopy): ToolPresentation {
	if (toolName === "getSelectedResume") {
		return { Icon: ReadCvLogoIcon, label: copy.toolReadCv };
	}
	if (toolName === "getUserMetadata") {
		return { Icon: IdentificationCardIcon, label: copy.toolReadProfile };
	}
	return { Icon: WrenchIcon, label: toolName ?? copy.toolGeneric };
}

function isCoverLetterArtifact(m: LettersChatPanelMessage): boolean {
	return m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE;
}

function ToolMessageRow({ copy, m }: { copy: ChatCopy; m: LettersChatPanelMessage }) {
	const { Icon, label } = toolPresentation(m.toolMeta?.toolName, copy);
	return (
		<div className="flex items-center gap-2 px-3 py-1 text-muted-foreground text-xs">
			<Icon className="size-3.5" weight="duotone" />
			<span>{label}</span>
		</div>
	);
}

function VersionRow({
	copy,
	isActive,
	m,
	maxVersions,
	onSelectVersion,
	versionNumber,
}: {
	copy: ChatCopy;
	isActive: boolean;
	m: LettersChatPanelMessage;
	maxVersions: number;
	onSelectVersion: (messageId: string) => void;
	versionNumber: number;
}) {
	const { Icon: StatusIcon, label: statusLabel } = isActive
		? { Icon: EyeIcon, label: copy.viewing }
		: { Icon: CursorClickIcon, label: copy.clickToLoad };
	return (
		<button
			className={cn(
				"flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left outline-none transition-colors",
				isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted/60"
			)}
			onClick={() => onSelectVersion(m.id)}
			type="button"
		>
			<span className="flex items-center gap-2 text-sm">
				<FileTextIcon
					className={cn("size-4 shrink-0", isActive ? "text-accent-foreground" : "text-muted-foreground")}
					weight="duotone"
				/>
				{copy.version} {versionNumber}/{maxVersions}
			</span>
			<span
				className={cn(
					"flex items-center gap-1.5 text-xs",
					isActive ? "text-accent-foreground/80" : "text-muted-foreground"
				)}
			>
				<StatusIcon className="size-3.5 shrink-0" weight="bold" />
				{statusLabel}
			</span>
		</button>
	);
}

/**
 * Left pane of /dash/letters/$generationId — pinned context + chat history + extra-prompt input.
 *
 * Builds on the AI Elements components: <Conversation> (sticky scroll-to-bottom),
 * <Message>/<MessageContent> (user/assistant bubbles). Submitting the form calls
 * `onTriggerAsync` (the route owns the underlying mutation so the artifact panel can
 * fire it too). The textarea clears only on a successful submit.
 *
 * Tool calls (`isTool: true`) render as inline muted rows; failed versions render as a
 * non-clickable "failed" row and are excluded from version numbering (only successful /
 * in-flight versions are navigable).
 */
export function LettersChatPanel({
	isPending,
	jobContextSource,
	jobPosition,
	maxVersions,
	messages,
	onOpenJobContext,
	onSaveTitle,
	onSelectVersion,
	onStartTour,
	onTriggerAsync,
	resumeTitle,
	selectedMessageId,
}: LettersChatPanelProps) {
	const [extraPrompt, setExtraPrompt] = useState("");
	const copy = CHAT_COPY;
	const isTargetJob = jobContextSource === "resume-job-target";

	// The job position doubles as the letter's title (generations.title). It's edited inline in
	// the context header and saved on blur via `onSaveTitle`. The ref holds the value the editor
	// emits per keystroke; the effect re-syncs it to the committed prop between edits so a
	// focus-then-blur with no typing never re-saves a stale value.
	const titleDraftRef = useRef(jobPosition);
	useEffect(() => {
		titleDraftRef.current = jobPosition;
	}, [jobPosition]);

	// Navigable versions = non-failed artifacts. Numbering derives from this list (computed
	// once) so it matches the right panel and the quota.
	const validVersions = messages.filter((m) => isCoverLetterArtifact(m) && !m.error);
	const latestValidId = validVersions.at(-1)?.id ?? null;

	// Once a successful (or in-flight) version exists, submit requires text — "regenerate as-is"
	// lives in the right panel's popover. If only failures exist, empty submit retries.
	const hasArtifact = validVersions.length > 0;
	const canSubmit = !isPending && (extraPrompt.trim().length > 0 || !hasArtifact);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-start gap-2.5 border-border/60 border-b px-4 pt-1 pb-3">
				<span
					className={cn(
						"flex size-7 shrink-0 items-center justify-center rounded-md",
						isTargetJob ? "bg-success/10 text-success-foreground" : "bg-muted-foreground/10 text-muted-foreground"
					)}
				>
					{isTargetJob ? (
						<TargetIcon className="size-4" weight="duotone" />
					) : (
						<PencilSimpleIcon className="size-4" weight="duotone" />
					)}
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="flex items-center justify-end gap-2">
						<span className="flex-1 text-muted-foreground text-xs">{copy.contextLabel}</span>

						<Button
							aria-label={isTargetJob ? copy.viewTarget : copy.viewManualTarget}
							className="-my-1 -mr-1.5 shrink-0 text-muted-foreground text-xs"
							onClick={onOpenJobContext}
							size="sm"
							variant="ghost-muted"
						>
							{isTargetJob ? copy.viewTarget : copy.viewManualTarget}
							<ArrowSquareOutIcon className="size-3.5" weight="bold" />
						</Button>

						{onStartTour && (
							<Button
								aria-label="Ver tutorial del espacio de trabajo"
								onClick={onStartTour}
								size="sm"
								variant="ghost-muted"
							>
								<QuestionIcon weight="bold" />
							</Button>
						)}
					</span>

					<InlineTextEditor
						className="wrap-break-word text-foreground"
						onBlur={() => onSaveTitle(titleDraftRef.current)}
						onChange={(value) => {
							titleDraftRef.current = value;
						}}
						placeholder={copy.titlePlaceholder}
						value={jobPosition}
						variant="plain"
					/>
					{resumeTitle && (
						<Badge className="mt-0.5 w-fit min-w-0 max-w-full" size="sm" variant="secondary">
							<ReadCvLogoIcon weight="fill" />
							<span className="min-w-0 truncate">{resumeTitle}</span>
						</Badge>
					)}
				</span>
			</div>

			<Conversation className="min-h-0 flex-1 overflow-y-auto" data-tour-step-id="letter-versions">
				<ConversationContent className="gap-1.5 px-2 py-3">
					<p className="px-3 pb-1 text-muted-foreground text-xs leading-relaxed">{copy.versionsTip}</p>

					{messages.map((m) => {
						if (m.isTool === true) {
							return <ToolMessageRow copy={copy} key={m.id} m={m} />;
						}

						if (isCoverLetterArtifact(m)) {
							// Failed version: distinct row, not clickable, excluded from numbering.
							if (m.error) {
								return (
									<div
										className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive text-sm"
										key={m.id}
									>
										<WarningCircleIcon className="size-4 shrink-0" weight="fill" />
										{copy.failed}
									</div>
								);
							}

							const versionNumber = validVersions.findIndex((item) => item.id === m.id) + 1;
							const isActive = selectedMessageId === m.id || (selectedMessageId === null && m.id === latestValidId);

							return (
								<VersionRow
									copy={copy}
									isActive={isActive}
									key={m.id}
									m={m}
									maxVersions={maxVersions}
									onSelectVersion={onSelectVersion}
									versionNumber={versionNumber}
								/>
							);
						}

						return (
							<Message from={m.isAssistant ? "assistant" : "user"} key={m.id}>
								<MessageContent>{m.text ?? ""}</MessageContent>
							</Message>
						);
					})}
				</ConversationContent>
			</Conversation>

			<div className="shrink-0 p-3">
				<form
					className="flex flex-col gap-2 rounded-2xl border border-input bg-card p-2 shadow-xs transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24"
					data-tour-step-id="letter-chat-input"
					onSubmit={async (e) => {
						e.preventDefault();
						if (!canSubmit) {
							return;
						}
						const trimmed = extraPrompt.trim();
						try {
							const result = await onTriggerAsync({ extraPrompt: trimmed || undefined });
							// `undefined` = the route didn't fire (limit reached / run in flight): the
							// user sees the limit dialog and keeps their text.
							if (result !== undefined) {
								setExtraPrompt("");
							}
						} catch {
							// Toast already emitted by the route; keep the text for retry.
						}
					}}
				>
					<Textarea
						aria-label={copy.fieldLabel}
						disabled={isPending}
						id="extra-prompt"
						maxLength={2000}
						onChange={(e) => setExtraPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								e.currentTarget.form?.requestSubmit();
							}
						}}
						placeholder={copy.placeholder}
						rows={3}
						unstyled
						value={extraPrompt}
					/>
					<div className="flex items-center justify-end">
						<Button disabled={!canSubmit} size="sm" type="submit">
							<PaperPlaneRightIcon weight="bold" />
							{isPending ? copy.generating : copy.generate}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

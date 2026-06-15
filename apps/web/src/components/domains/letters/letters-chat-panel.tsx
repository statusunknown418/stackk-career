"use client";

import {
	CursorClickIcon,
	EyeIcon,
	FileTextIcon,
	IdentificationCardIcon,
	PaperPlaneRightIcon,
	QuestionIcon,
	ReadCvLogoIcon,
	WrenchIcon,
} from "@phosphor-icons/react";
import { COVER_LETTER_OBJECT_TYPE } from "@stackk-career/schemas/ai/cover-letter";
import type { ComponentType } from "react";
import { useState } from "react";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
	jobPosition: string;
	maxVersions: number;
	messages: readonly LettersChatPanelMessage[];
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
	introPrefix: "Voy a redactar tu carta para",
	introResume: "usando el CV",
	toneHint: "Si quieres orientar el tono o resaltar algo, escríbelo abajo.",
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
	jobPosition,
	maxVersions,
	messages,
	onSelectVersion,
	onStartTour,
	onTriggerAsync,
	resumeTitle,
	selectedMessageId,
}: LettersChatPanelProps) {
	const [extraPrompt, setExtraPrompt] = useState("");
	const copy = CHAT_COPY;

	// Navigable versions = non-failed artifacts. Numbering derives from this list (computed
	// once) so it matches the right panel and the quota.
	const validVersions = messages.filter((m) => isCoverLetterArtifact(m) && !m.error);
	const latestValidId = validVersions.at(-1)?.id ?? null;

	// Once a successful (or in-flight) version exists, submit requires text — "regenerate as-is"
	// lives in the right panel's popover. If only failures exist, empty submit retries.
	const hasArtifact = validVersions.length > 0;
	const canSubmit = !isPending && (extraPrompt.trim().length > 0 || !hasArtifact);

	return (
		<section className="flex h-full min-h-0 flex-col gap-4">
			<Conversation className="min-h-0 flex-1 overflow-y-auto" data-tour-step-id="letter-versions">
				<ConversationContent>
					<Message from="assistant">
						<MessageContent>
							<p className="text-sm">
								{copy.introPrefix} <strong>{jobPosition}</strong>
								{resumeTitle && (
									<>
										{" "}
										{copy.introResume} <strong>{resumeTitle}</strong>
									</>
								)}
								.
							</p>
							<p className="mt-1 text-muted-foreground text-xs">{copy.toneHint}</p>
							<p className="mt-2 border-border/40 border-t pt-2 font-medium text-muted-foreground text-xs">
								{copy.versionsTip}
							</p>
							{onStartTour && (
								<Button
									aria-label="Ver tutorial del espacio de trabajo"
									className="mt-3"
									onClick={onStartTour}
									size="sm"
									variant="ghost-muted"
								>
									<QuestionIcon weight="bold" />
									Cómo funciona
								</Button>
							)}
						</MessageContent>
					</Message>

					{messages.map((m) => {
						if (m.isTool === true) {
							const { Icon, label } = toolPresentation(m.toolMeta?.toolName, copy);
							return (
								<div className="flex items-center gap-2 px-3 py-1 text-muted-foreground text-xs" key={m.id}>
									<Icon className="size-3.5" weight="duotone" />
									<span>{label}</span>
								</div>
							);
						}

						if (isCoverLetterArtifact(m)) {
							// Failed version: distinct row, not clickable, excluded from numbering.
							if (m.error) {
								return (
									<Message from="assistant" key={m.id}>
										<MessageContent>
											<div className="flex w-full items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 font-medium text-destructive text-sm">
												⚠️ {copy.failed}
											</div>
										</MessageContent>
									</Message>
								);
							}

							const versionNumber = validVersions.findIndex((item) => item.id === m.id) + 1;
							const isActive = selectedMessageId === m.id || (selectedMessageId === null && m.id === latestValidId);
							const { Icon: StatusIcon, label: statusLabel } = isActive
								? { Icon: EyeIcon, label: copy.viewing }
								: { Icon: CursorClickIcon, label: copy.clickToLoad };

							return (
								<Message from="assistant" key={m.id}>
									<MessageContent>
										<button
											className={cn(
												"flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left outline-none transition-all",
												isActive
													? "border-accent bg-accent/72 text-accent-foreground shadow-sm"
													: "border-border/40 bg-muted/32 text-foreground hover:bg-muted/72"
											)}
											onClick={() => onSelectVersion(m.id)}
											type="button"
										>
											<span className="flex items-center gap-2 font-semibold text-sm">
												<FileTextIcon className="size-4 shrink-0" weight="duotone" />
												{copy.version} {versionNumber}/{maxVersions}
											</span>
											<span className="flex items-center gap-1.5 font-normal text-muted-foreground text-xs">
												<StatusIcon className="size-3.5 shrink-0" weight="bold" />
												{statusLabel}
											</span>
										</button>
									</MessageContent>
								</Message>
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

			<form
				className="flex shrink-0 flex-col gap-2 border-border border-t pt-4"
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
				<Field>
					<FieldLabel className="sr-only" htmlFor="extra-prompt">
						{copy.fieldLabel}
					</FieldLabel>
					<Textarea
						disabled={isPending}
						id="extra-prompt"
						maxLength={2000}
						onChange={(e) => setExtraPrompt(e.target.value)}
						placeholder={copy.placeholder}
						rows={3}
						value={extraPrompt}
					/>
				</Field>

				<Button className="self-end" disabled={!canSubmit} size="sm" type="submit">
					<PaperPlaneRightIcon weight="bold" />
					{isPending ? copy.generating : copy.generate}
				</Button>
			</form>
		</section>
	);
}

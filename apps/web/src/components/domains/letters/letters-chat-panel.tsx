"use client";

import { IdentificationCardIcon, PaperPlaneRightIcon, ReadCvLogoIcon, WrenchIcon } from "@phosphor-icons/react";
import { COVER_LETTER_OBJECT_TYPE } from "@stackk-career/schemas/ai/cover-letter";
import { MAX_COVER_LETTER_VERSIONS } from "@stackk-career/schemas/api/letters";
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
	messages: readonly LettersChatPanelMessage[];
	onSelectVersion: (messageId: string) => void;
	onTriggerAsync: (input: { extraPrompt?: string }) => Promise<unknown>;
	resumeTitle: string | null;
	selectedMessageId: string | null;
}

interface ToolPresentation {
	Icon: ComponentType<{ className?: string; weight?: "duotone" }>;
	label: string;
}

/**
 * Chrome del chat panel — SIEMPRE en español (es el idioma de la app: sidebar, panel derecho,
 * etc. también lo están). El idioma de la carta (es/en) afecta SOLO el contenido del artifact,
 * no la UI. No localizar este chrome al idioma de la carta o queda inconsistente con la app.
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
	messages,
	onSelectVersion,
	onTriggerAsync,
	resumeTitle,
	selectedMessageId,
}: LettersChatPanelProps) {
	const [extraPrompt, setExtraPrompt] = useState("");
	const copy = CHAT_COPY;

	// Versiones navegables = artifacts NO fallidos. La numeración deriva de esta lista
	// (computada una vez, no por mensaje) para que coincida con el panel derecho y la cuota.
	const validVersions = messages.filter((m) => isCoverLetterArtifact(m) && !m.error);
	const latestValidId = validVersions.at(-1)?.id ?? null;

	// Una vez que existe una versión EXITOSA (o en curso), el submit exige texto: regenerar
	// "sin cambios" vive en el popover del panel derecho. Si solo hubo fallidas, se permite
	// submit vacío para reintentar.
	const hasArtifact = validVersions.length > 0;
	const canSubmit = !isPending && (extraPrompt.trim().length > 0 || !hasArtifact);

	return (
		<section className="flex h-full flex-col gap-4">
			<Conversation className="flex-1">
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
							// Versión fallida: fila distinta, NO clickeable, fuera de la numeración.
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
												📄 {copy.version} {versionNumber}/{MAX_COVER_LETTER_VERSIONS}
											</span>
											<span className="font-normal text-muted-foreground text-xs">
												{isActive ? copy.viewing : copy.clickToLoad}
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
				className="flex flex-col gap-2 border-border border-t pt-4"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!canSubmit) {
						return;
					}
					const trimmed = extraPrompt.trim();
					try {
						await onTriggerAsync({ extraPrompt: trimmed || undefined });
						setExtraPrompt("");
					} catch {
						// Toast ya emitido por la route; mantenemos el texto para reintento.
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

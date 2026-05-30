"use client";

import { IdentificationCardIcon, PaperPlaneRightIcon, ReadCvLogoIcon, WrenchIcon } from "@phosphor-icons/react";
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

const TOOL_PRESENTATION: Record<string, ToolPresentation> = {
	getSelectedResume: { Icon: ReadCvLogoIcon, label: "CASEY leyó tu CV" },
	getUserMetadata: { Icon: IdentificationCardIcon, label: "CASEY revisó tu perfil" },
};

function toolPresentation(toolName: string | undefined): ToolPresentation {
	if (toolName && TOOL_PRESENTATION[toolName]) {
		return TOOL_PRESENTATION[toolName];
	}
	return { Icon: WrenchIcon, label: toolName ?? "CASEY consultó una herramienta" };
}

/**
 * Left pane of /dash/letters/$generationId — pinned context + chat history + extra-prompt input.
 *
 * Builds on the AI Elements components: <Conversation> (sticky scroll-to-bottom),
 * <Message>/<MessageContent> (user/assistant bubbles). Submitting the form calls
 * `onTriggerAsync` (the route owns the underlying mutation so the artifact panel
 * can fire it too). The textarea clears only on a successful submit so the user
 * doesn't lose text if the trigger fails.
 *
 * Tool calls (`isTool: true`) render as inline muted rows with a friendly Spanish
 * label per the Letters architecture diagram (getUserMetadata → message, etc).
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

	// Keep all messages in chronological order so we can select versions.
	const chatMessages = messages;

	return (
		<section className="flex h-full flex-col gap-4">
			<Conversation className="flex-1">
				<ConversationContent>
					<Message from="assistant">
						<MessageContent>
							<p className="text-sm">
								Voy a redactar tu carta para <strong>{jobPosition}</strong>
								{resumeTitle && (
									<>
										{" "}
										usando el CV <strong>{resumeTitle}</strong>
									</>
								)}
								.
							</p>
							<p className="mt-1 text-muted-foreground text-xs">
								Si quieres orientar el tono o resaltar algo, escríbelo abajo.
							</p>
							<p className="mt-2 border-border/40 border-t pt-2 font-medium text-muted-foreground text-xs">
								💡 Puedes hacer clic en las versiones generadas en el chat para ver su contenido en el panel de la
								derecha.
							</p>
						</MessageContent>
					</Message>

					{chatMessages.map((m) => {
						if (m.isTool === true) {
							const { Icon, label } = toolPresentation(m.toolMeta?.toolName);
							return (
								<div className="flex items-center gap-2 px-3 py-1 text-muted-foreground text-xs" key={m.id}>
									<Icon className="size-3.5" weight="duotone" />
									<span>{label}</span>
								</div>
							);
						}

						if (m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE) {
							const coverLetterMessages = messages.filter(
								(msg) => msg.isAssistant === true && msg.objectType === COVER_LETTER_OBJECT_TYPE
							);
							const versionNumber = coverLetterMessages.findIndex((item) => item.id === m.id) + 1;
							const isActive =
								selectedMessageId === m.id || (selectedMessageId === null && m.id === coverLetterMessages.at(-1)?.id);

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
												📄 Versión {versionNumber}/5
											</span>
											<span className="font-normal text-muted-foreground text-xs">
												{isActive ? "Visualizando" : "Haz clic para cargar"}
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
						Indicación adicional
					</FieldLabel>
					<Textarea
						disabled={isPending}
						id="extra-prompt"
						maxLength={2000}
						onChange={(e) => setExtraPrompt(e.target.value)}
						placeholder="Ej. Tono más cálido. Menciona que tengo experiencia en fintech."
						rows={3}
						value={extraPrompt}
					/>
				</Field>

				<Button className="self-end" disabled={isPending} size="sm" type="submit">
					<PaperPlaneRightIcon weight="bold" />
					{isPending ? "Generando…" : "Generar carta"}
				</Button>
			</form>
		</section>
	);
}

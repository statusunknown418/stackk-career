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
	onTriggerAsync: (input: { extraPrompt?: string }) => Promise<unknown>;
	resumeTitle: string | null;
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
	onTriggerAsync,
	resumeTitle,
}: LettersChatPanelProps) {
	const [extraPrompt, setExtraPrompt] = useState("");

	// Hide artifact messages — those render in the right pane — but keep tool rows.
	const chatMessages = messages.filter((m) => !(m.isAssistant === true && m.objectType === COVER_LETTER_OBJECT_TYPE));

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

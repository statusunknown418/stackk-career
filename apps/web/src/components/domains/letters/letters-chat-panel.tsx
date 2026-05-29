"use client";

import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import { COVER_LETTER_OBJECT_TYPE } from "@stackk-career/schemas/ai/cover-letter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

interface LettersChatPanelMessage {
	id: string;
	isAssistant: boolean | null;
	objectType: string | null;
	text: string | null;
}

interface LettersChatPanelProps {
	generationId: string;
	jobPosition: string;
	messages: readonly LettersChatPanelMessage[];
	resumeTitle: string | null;
}

/**
 * Left pane of /dash/letters/$generationId — pinned context + chat history + extra-prompt input.
 *
 * Builds on the AI Elements components: <Conversation> (sticky scroll-to-bottom),
 * <Message>/<MessageContent> (user/assistant bubbles). Submitting the form calls
 * `orpc.letters.trigger`, which today is a stub that inserts a placeholder
 * artifact; the real CASEY-Letters task wiring lands in the next PR.
 */
export function LettersChatPanel({ generationId, jobPosition, messages, resumeTitle }: LettersChatPanelProps) {
	const queryClient = useQueryClient();
	const [extraPrompt, setExtraPrompt] = useState("");

	const triggerMutation = useMutation(
		orpc.letters.trigger.mutationOptions({
			onSuccess: () => {
				setExtraPrompt("");
				queryClient.invalidateQueries({
					queryKey: orpc.letters.get.queryKey({ input: { generationId } }),
				});
			},
			onError: (err) => toast.error(err.message),
		})
	);

	// Hide the artifact messages from the chat — those render in the right pane.
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

					{chatMessages.map((m) => (
						<Message from={m.isAssistant ? "assistant" : "user"} key={m.id}>
							<MessageContent>{m.text ?? ""}</MessageContent>
						</Message>
					))}
				</ConversationContent>
			</Conversation>

			<form
				className="flex flex-col gap-2 border-border border-t pt-4"
				onSubmit={(e) => {
					e.preventDefault();
					triggerMutation.mutate({
						generationId,
						extraPrompt: extraPrompt.trim() || undefined,
					});
				}}
			>
				<Field>
					<FieldLabel className="sr-only" htmlFor="extra-prompt">
						Indicación adicional
					</FieldLabel>
					<Textarea
						disabled={triggerMutation.isPending}
						id="extra-prompt"
						maxLength={2000}
						onChange={(e) => setExtraPrompt(e.target.value)}
						placeholder="Ej. Tono más cálido. Menciona que tengo experiencia en fintech."
						rows={3}
						value={extraPrompt}
					/>
				</Field>

				<Button className="self-end" disabled={triggerMutation.isPending} size="sm" type="submit">
					<PaperPlaneRightIcon weight="bold" />
					{triggerMutation.isPending ? "Generando…" : "Generar carta"}
				</Button>
			</form>
		</section>
	);
}

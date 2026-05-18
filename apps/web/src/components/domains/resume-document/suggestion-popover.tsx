"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { ArrowClockwiseIcon, SparkleIcon } from "@phosphor-icons/react";
import { type SuggestResumeBlockInput, suggestResumeBlockOutputSchema } from "@stackk-career/schemas/api/suggestions";
import { sanitizeResumeRichTextHtml } from "@stackk-career/schemas/db/resume-blocks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { InlineTextEditor } from "./inline-text-editor";

interface Props {
	input: SuggestResumeBlockInput;
	onApply: (html: string) => void;
	onOpenChange?: (open: boolean) => void;
}

export function SuggestionPopover({ input, onApply, onOpenChange }: Props) {
	const [open, setOpen] = useState(false);

	const { object, submit, isLoading, stop, error } = useObject({
		schema: suggestResumeBlockOutputSchema,
		api: "/api/resume-suggestions",
	});

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		onOpenChange?.(next);
		if (next) {
			submit(input);
		} else {
			stop();
		}
	};

	const suggestions = object?.suggestions ?? [];

	const handleApply = (html: string) => {
		onApply(sanitizeResumeRichTextHtml(html));
		handleOpenChange(false);
	};

	return (
		<Popover onOpenChange={handleOpenChange} open={open}>
			<PopoverTrigger
				render={
					<Button aria-label="Mejorar con IA" className="" type="button" variant="ghost">
						<SparkleIcon /> Mejorar
					</Button>
				}
			/>
			<PopoverPopup align="end" className="w-100">
				<header className="flex items-center justify-between pb-1.5">
					<div className="flex items-center gap-1.5 font-medium text-foreground text-sm">
						<SparkleIcon
							className={isLoading ? "size-3.5 animate-pulse text-primary" : "size-3.5 text-muted-foreground"}
							weight="fill"
						/>
						Sugerencias
					</div>

					{error && (
						<Button aria-label="Reintentar" onClick={() => submit(input)} size="icon-sm" type="button" variant="ghost">
							<ArrowClockwiseIcon />
						</Button>
					)}
				</header>

				{error ? (
					<p className="pb-4 text-muted-foreground text-xs">No se pudieron generar sugerencias.</p>
				) : (
					<ul className="flex flex-col">
						{SUGGESTION_SLOTS.map((slot) => {
							const html = suggestions[slot]?.html;

							if (!html) {
								return (
									<li className="border-t p-2" key={slot}>
										<SuggestionSkeleton />
									</li>
								);
							}

							return (
								<li className="border-t pt-2" key={slot}>
									<button
										className="w-full cursor-pointer text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
										onClick={() => handleApply(html)}
										type="button"
									>
										<InlineTextEditor
											onChange={() => {
												return;
											}}
											readOnly
											value={sanitizeResumeRichTextHtml(html)}
											variant="prose"
										/>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</PopoverPopup>
		</Popover>
	);
}

const SUGGESTION_SLOTS = [0, 1, 2] as const;

const SuggestionSkeleton = () => (
	<div aria-hidden="true" className="space-y-1.5">
		<div className="h-2 w-[92%] animate-pulse rounded-full bg-muted" />
		<div className="h-2 w-[78%] animate-pulse rounded-full bg-muted" />
		<div className="h-2 w-[64%] animate-pulse rounded-full bg-muted" />
	</div>
);

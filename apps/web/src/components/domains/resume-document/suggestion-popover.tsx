"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { ArrowClockwiseIcon, SparkleIcon } from "@phosphor-icons/react";
import { type SuggestResumeBlockInput, suggestResumeBlockOutputSchema } from "@stackk-career/schemas/api/suggestions";
import { sanitizeResumeRichTextHtml } from "@stackk-career/schemas/db/resume-blocks";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Classic } from "@/components/loading-ui/classic";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { InlineTextEditor } from "./inline-text-editor";

interface Props {
	input: SuggestResumeBlockInput;
	onApply: (html: string) => void;
	onOpenChange?: (open: boolean) => void;
}

const SUGGESTION_SLOTS = [0, 1, 2, 3] as const;

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
					<Button aria-label="Mejorar con IA" type="button" variant="ghost">
						<SparkleIcon /> Mejorar
					</Button>
				}
			/>
			<PopoverPopup align="end" className="w-2xl">
				<header className="flex items-center justify-between px-2 pt-1 pb-2">
					<div className="flex items-center gap-1.5 font-medium text-sm">
						<SparkleIcon
							className={isLoading ? "size-3.5 text-primary" : "size-3.5 text-muted-foreground"}
							weight="fill"
						/>
						{isLoading ? (
							<Shimmer as="span">Generando sugerencias</Shimmer>
						) : (
							<span className="text-foreground">Sugerencias</span>
						)}
					</div>

					{error && (
						<Button aria-label="Reintentar" onClick={() => submit(input)} size="icon-sm" type="button" variant="ghost">
							<ArrowClockwiseIcon />
						</Button>
					)}
				</header>

				{error ? (
					<p className="px-2 pb-3 text-muted-foreground text-xs">No se pudieron generar sugerencias.</p>
				) : (
					<div className="columns-2 gap-1.5 [&>*]:mb-1.5">
						{SUGGESTION_SLOTS.map((slot) => {
							const item = suggestions[slot];

							if (!item) {
								return (
									<div
										className="flex break-inside-avoid flex-col gap-1.5 rounded-lg border border-dashed bg-muted/30 p-3"
										key={slot}
									>
										<Shimmer as="span" className="font-medium text-xs uppercase tracking-wide">
											Generando opción
										</Shimmer>
										<div className="flex items-center justify-center py-3">
											<Classic className="size-4 text-muted-foreground" />
										</div>
									</div>
								);
							}

							const html = item.html ?? "";
							const label = item.label ?? "";
							const ready = Boolean(item.html && item.label) && !isLoading;

							return (
								<button
									className="group flex w-full cursor-pointer break-inside-avoid flex-col gap-1.5 rounded-lg border p-2 text-left shadow-xs transition-all hover:border-primary/40 hover:bg-accent hover:shadow-sm focus-visible:border-primary/60 focus-visible:bg-accent focus-visible:outline-none disabled:cursor-default disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:shadow-xs"
									disabled={!ready}
									key={slot}
									onClick={() => ready && handleApply(html)}
									type="button"
								>
									{label ? (
										<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide group-hover:text-foreground">
											{label}
										</span>
									) : (
										<Shimmer as="span" className="font-medium text-xs uppercase tracking-wide">
											···
										</Shimmer>
									)}
									{html ? (
										<InlineTextEditor
											className="text-xs"
											onChange={() => undefined}
											readOnly
											value={sanitizeResumeRichTextHtml(html)}
											variant="prose"
										/>
									) : (
										<div className="flex items-center justify-center py-3">
											<Classic className="size-4 text-muted-foreground" />
										</div>
									)}
								</button>
							);
						})}
					</div>
				)}
			</PopoverPopup>
		</Popover>
	);
}

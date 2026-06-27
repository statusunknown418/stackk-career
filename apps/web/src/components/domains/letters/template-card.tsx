"use client";

import { CheckIcon } from "@phosphor-icons/react";
import {
	type CoverLetterTemplateName,
	coverLetterTemplateNames,
	TEMPLATE_OPTIONS,
} from "@stackk-career/schemas/api/letters";
import { RadioGroupPrimitive, RadioPrimitive } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { type LetterAccent, TEMPLATE_ACCENTS } from "./letter-accents";

const SAMPLE_NAME = "Brian Wayne";
const SAMPLE_ROLE = "Product Manager";
const SAMPLE_GREETING = "Estimado equipo:";
const BODY_BARS = [
	{ id: "l1", width: "w-full" },
	{ id: "l2", width: "w-11/12" },
	{ id: "l3", width: "w-full" },
	{ id: "l4", width: "w-3/4" },
] as const;

/** Faint paragraph placeholder lines, neutral so they read in light and dark. */
function BodyLines() {
	return (
		<div className="flex flex-col gap-1">
			{BODY_BARS.map(({ id, width }) => (
				<span className={cn("h-1 rounded-full bg-foreground/10", width)} key={id} />
			))}
		</div>
	);
}

/** Small "Atentamente, + name" sign-off used by the left-aligned typographic minis. */
function SignOff() {
	return (
		<div className="mt-auto flex flex-col gap-0.5">
			<span className="text-[5px] text-muted-foreground leading-none">Atentamente,</span>
			<span className="text-[6px] text-foreground leading-none">{SAMPLE_NAME}</span>
		</div>
	);
}

const PAGE_BASE = "flex aspect-3/4 w-full flex-col overflow-hidden rounded-md border bg-card text-card-foreground";

function StandardThumb() {
	return (
		<div aria-hidden="true" className={cn(PAGE_BASE, "gap-1.5 p-2.5")}>
			<span className="text-[7px] text-foreground leading-none">{SAMPLE_NAME}</span>
			<span className="text-[5px] text-muted-foreground leading-none">{SAMPLE_ROLE}</span>
			<span className="mt-0.5 h-px w-full bg-border" />
			<span className="ml-auto text-[5px] text-muted-foreground leading-none">12 jun 2026</span>
			<span className="text-[5.5px] text-foreground leading-none">{SAMPLE_GREETING}</span>
			<BodyLines />
			<SignOff />
		</div>
	);
}

function ModernThumb() {
	return (
		<div aria-hidden="true" className={cn(PAGE_BASE, "gap-1.5 p-2.5")}>
			<div className="flex flex-col gap-0.5">
				<span className="text-[11px] text-foreground leading-none tracking-tight">{SAMPLE_NAME}</span>
				<span className="text-[5px] text-muted-foreground uppercase leading-none tracking-wider">{SAMPLE_ROLE}</span>
			</div>
			<span className="h-0.5 w-6 rounded-full bg-foreground/30" />
			<span className="mt-0.5 text-[5.5px] text-foreground leading-none">{SAMPLE_GREETING}</span>
			<BodyLines />
			<SignOff />
		</div>
	);
}

function EditorialThumb() {
	return (
		<div aria-hidden="true" className={cn(PAGE_BASE, "items-center gap-1.5 p-2.5")}>
			<span className="mt-1 font-serif text-[12px] text-foreground leading-none">{SAMPLE_NAME}</span>
			<span className="text-[5px] text-muted-foreground uppercase leading-none tracking-[0.18em]">{SAMPLE_ROLE}</span>
			<span className="h-px w-5 bg-border" />
			<span className="mt-0.5 w-full text-center text-[5.5px] text-foreground leading-none">{SAMPLE_GREETING}</span>
			<BodyLines />
			<span className="mt-auto font-serif text-[8px] text-foreground leading-none">{SAMPLE_NAME}</span>
		</div>
	);
}

function CreativeThumb({ accent }: { accent: LetterAccent }) {
	return (
		<div aria-hidden="true" className={PAGE_BASE}>
			<div className={cn("flex flex-col gap-0.5 px-2.5 py-2", accent.band, accent.bandText)}>
				<span className="text-[8px] leading-none">{SAMPLE_NAME}</span>
				<span className={cn("text-[4.5px] uppercase leading-none tracking-wider", accent.bandTextMuted)}>
					{SAMPLE_ROLE}
				</span>
			</div>
			<div className="flex flex-1 flex-col gap-1.5 p-2.5">
				<span className="text-[5.5px] text-foreground leading-none">{SAMPLE_GREETING}</span>
				<BodyLines />
				<span className="mt-auto text-[6px] text-foreground leading-none">{SAMPLE_NAME}</span>
			</div>
		</div>
	);
}

function VibrantThumb({ accent }: { accent: LetterAccent }) {
	return (
		<div aria-hidden="true" className={cn(PAGE_BASE, "gap-1.5 p-2.5")}>
			<div className="flex items-center gap-1.5">
				<span
					className={cn(
						"flex size-6 shrink-0 items-center justify-center rounded-md text-[7px] leading-none",
						accent.band,
						accent.bandText
					)}
				>
					BW
				</span>
				<div className="flex flex-col gap-0.5">
					<span className="text-[8px] text-foreground leading-none">{SAMPLE_NAME}</span>
					<span className={cn("text-[4.5px] uppercase leading-none tracking-wider", accent.text)}>{SAMPLE_ROLE}</span>
				</div>
			</div>
			<span className="mt-0.5 text-[5.5px] text-foreground leading-none">{SAMPLE_GREETING}</span>
			<BodyLines />
			<span className={cn("mt-auto text-[6px] leading-none", accent.text)}>{SAMPLE_NAME}</span>
		</div>
	);
}

/**
 * Miniature letter preview that conveys a template's identity (alignment, type family,
 * hierarchy and — for the playful templates — accent color) at thumbnail scale, using
 * semantic tokens so it renders correctly in dark mode with no hardcoded paper colors.
 */
function TemplateThumbnail({ template }: { template: CoverLetterTemplateName }) {
	if (template === "modern") {
		return <ModernThumb />;
	}
	if (template === "editorial") {
		return <EditorialThumb />;
	}
	const accent = TEMPLATE_ACCENTS[template];
	if (template === "creative" && accent) {
		return <CreativeThumb accent={accent} />;
	}
	if (template === "vibrant" && accent) {
		return <VibrantThumb accent={accent} />;
	}
	return <StandardThumb />;
}

interface TemplatePickerProps {
	disabled?: boolean;
	id?: string;
	onValueChange: (value: CoverLetterTemplateName) => void;
	value: CoverLetterTemplateName;
}

/**
 * Card-selector (accessible radio group) for the letter's template. Each option shows a live,
 * token-driven thumbnail; the selected option's description sits below the grid.
 */
export function TemplatePicker({ disabled, id, onValueChange, value }: TemplatePickerProps) {
	const selected = TEMPLATE_OPTIONS.find((option) => option.value === value);

	return (
		<div className="flex flex-col gap-2.5">
			<RadioGroupPrimitive
				className="grid grid-cols-4 gap-2.5"
				disabled={disabled}
				id={id}
				onValueChange={(next) => {
					if (typeof next === "string" && (coverLetterTemplateNames as readonly string[]).includes(next)) {
						onValueChange(next as CoverLetterTemplateName);
					}
				}}
				value={value}
			>
				{TEMPLATE_OPTIONS.map((option) => (
					<RadioPrimitive.Root
						aria-label={option.label}
						className="group/tpl flex shrink-0 cursor-pointer flex-col gap-2 rounded-xl border bg-transparent p-2 text-left outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-disabled:cursor-not-allowed data-checked:border-primary data-checked:bg-accent/50 data-disabled:opacity-64"
						key={option.value}
						value={option.value}
					>
						<div className="relative">
							<TemplateThumbnail template={option.value} />
							<span className="absolute top-1 right-1 hidden size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm group-data-checked/tpl:flex">
								<CheckIcon className="size-2.5" weight="bold" />
							</span>
						</div>

						<span className="text-center text-muted-foreground text-xs leading-none group-data-checked/tpl:text-foreground">
							{option.label}
						</span>
					</RadioPrimitive.Root>
				))}
			</RadioGroupPrimitive>
			{selected ? <p className="text-muted-foreground text-xs leading-snug">{selected.description}</p> : null}
		</div>
	);
}

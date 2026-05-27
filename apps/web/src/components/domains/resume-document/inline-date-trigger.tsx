"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { useId, useState } from "react";
import { MonthPicker } from "@/components/domains/resume-editor/fields/month-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFieldContext } from "@/lib/forms/resume-form";
import { cn } from "@/lib/utils";

interface InlineDateTriggerProps {
	disabled?: boolean;
	disableFuture?: boolean;
	emptyAsNull?: boolean;
	placeholder?: string;
}

const MONTH_FORMAT = "yyyy-MM";

const parseStoredValue = (value: string | null | undefined): Date | undefined => {
	if (!value) {
		return;
	}
	const parsed = parse(value, MONTH_FORMAT, new Date());
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatDisplay = (date: Date | undefined): string | null =>
	date ? format(date, "MMM yyyy", { locale: es }) : null;

export function InlineDateTrigger({
	disabled = false,
	disableFuture = false,
	emptyAsNull = false,
	placeholder = "Fecha",
}: InlineDateTriggerProps) {
	const field = useFieldContext<string | null | undefined>();
	const id = useId();
	const [open, setOpen] = useState(false);

	const selectedDate = parseStoredValue(field.state.value);
	const display = formatDisplay(selectedDate);
	const maxDate = disableFuture ? new Date() : undefined;

	const handleSelect = (next: Date) => {
		const firstOfMonth = new Date(next.getFullYear(), next.getMonth(), 1);
		field.handleChange(format(firstOfMonth, MONTH_FORMAT));
		setOpen(false);
	};

	const handleClear = () => {
		field.handleChange(emptyAsNull ? null : "");
		setOpen(false);
	};

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger
				render={
					<button
						className={cn(
							"inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-sm transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:outline-none",
							disabled && "cursor-not-allowed opacity-50",
							!display && "text-muted-foreground/60"
						)}
						disabled={disabled}
						id={id}
						onBlur={field.handleBlur}
						type="button"
					>
						<CalendarBlankIcon className="size-3.5" />
						<span className={display ? "capitalize" : undefined}>{display ?? placeholder}</span>
					</button>
				}
			/>

			<PopoverContent align="start" className="w-auto p-0!">
				<MonthPicker maxDate={maxDate} onSelect={handleSelect} selected={selectedDate} />

				{selectedDate && (
					<div className="flex justify-end border-t px-2 pt-2">
						<Button onClick={handleClear} size="sm" type="button" variant="ghost">
							Limpiar
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

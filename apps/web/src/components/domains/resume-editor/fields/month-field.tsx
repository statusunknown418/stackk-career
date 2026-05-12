"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFieldContext } from "@/lib/forms/resume-form";
import { MonthPicker } from "./month-picker";

interface MonthFieldProps {
	disabled?: boolean;
	emptyAsNull?: boolean;
	label: string;
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

export function MonthField({ disabled = false, emptyAsNull = false, label }: MonthFieldProps) {
	const field = useFieldContext<string | null | undefined>();
	const id = useId();
	const [open, setOpen] = useState(false);

	const selectedDate = parseStoredValue(field.state.value);
	const display = formatDisplay(selectedDate);

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
		<div className="flex min-w-0 flex-col gap-1">
			<label className="font-medium text-muted-foreground text-xs uppercase tracking-wide" htmlFor={id}>
				{label}
			</label>

			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger
					render={
						<Button disabled={disabled} id={id} onBlur={field.handleBlur} type="button" variant="outline">
							<CalendarBlankIcon />
							{display ? (
								<span className="capitalize">{display}</span>
							) : (
								<span className="text-muted-foreground">Seleccionar mes</span>
							)}
						</Button>
					}
				/>

				<PopoverContent align="start" className="w-auto p-0!">
					<MonthPicker onSelect={handleSelect} selected={selectedDate} />

					{selectedDate && (
						<div className="flex justify-end border-t px-2 pt-2">
							<Button onClick={handleClear} size="sm" type="button" variant="ghost">
								Limpiar
							</Button>
						</div>
					)}
				</PopoverContent>
			</Popover>
		</div>
	);
}

"use client";

import { useId } from "react";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFieldContext } from "@/lib/forms/resume-form";

type SelectFieldOption = string | { label: string; value: string };

interface SelectFieldProps {
	"aria-label"?: string;
	emptyAsUndefined?: boolean;
	label?: string;
	options: readonly SelectFieldOption[];
	placeholder?: string;
}

const normalizeOption = (option: SelectFieldOption) =>
	typeof option === "string" ? { label: option, value: option } : option;

export function SelectField({
	"aria-label": ariaLabel,
	emptyAsUndefined = false,
	label,
	options,
	placeholder,
}: SelectFieldProps) {
	const field = useFieldContext<string | undefined>();
	const id = useId();
	const normalized = options.map(normalizeOption);
	const resolvedPlaceholder = placeholder ?? (label ? `Selecciona ${label.toLowerCase()}` : "Selecciona");

	return (
		<div className="flex min-w-0 flex-col gap-1">
			{label && (
				<label className="font-medium text-muted-foreground text-xs uppercase tracking-wide" htmlFor={id}>
					{label}
				</label>
			)}

			<Select
				items={normalized}
				onValueChange={(next) => {
					if (next === null || next === "") {
						field.handleChange(emptyAsUndefined ? undefined : "");
						return;
					}

					field.handleChange(next);
				}}
				value={field.state.value ?? ""}
			>
				<SelectTrigger aria-label={label ? undefined : ariaLabel} id={id} onBlur={field.handleBlur} size="sm">
					<SelectValue placeholder={resolvedPlaceholder} />
				</SelectTrigger>

				<SelectPopup>
					{normalized.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>
		</div>
	);
}

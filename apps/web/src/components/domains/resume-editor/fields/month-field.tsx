"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { useFieldContext } from "@/lib/forms/resume-form";

interface MonthFieldProps {
	className?: string;
	disabled?: boolean;
	emptyAsNull?: boolean;
	label: string;
}

export function MonthField({ className, disabled = false, emptyAsNull = false, label }: MonthFieldProps) {
	const field = useFieldContext<string | null | undefined>();
	const id = useId();

	return (
		<label className="flex min-w-0 flex-col gap-1" htmlFor={id}>
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
			<Input
				className={className}
				disabled={disabled}
				id={id}
				nativeInput
				onBlur={field.handleBlur}
				onChange={(event) => {
					const next = event.currentTarget.value;
					field.handleChange(emptyAsNull && next === "" ? null : next);
				}}
				type="month"
				value={field.state.value ?? ""}
				variant="ghost"
			/>
		</label>
	);
}

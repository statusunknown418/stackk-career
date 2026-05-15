"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFieldContext } from "@/lib/forms/resume-form";

interface CheckboxFieldProps {
	label: string;
}

export function CheckboxField({ label }: CheckboxFieldProps) {
	const field = useFieldContext<boolean>();
	const id = useId();

	return (
		<div className="flex items-center gap-2 text-sm">
			<Checkbox
				checked={field.state.value ?? false}
				id={id}
				onBlur={field.handleBlur}
				onCheckedChange={(next) => field.handleChange(next === true)}
			/>
			<label htmlFor={id}>{label}</label>
		</div>
	);
}

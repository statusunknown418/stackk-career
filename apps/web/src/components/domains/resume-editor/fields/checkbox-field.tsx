"use client";

import { useFieldContext } from "@/lib/forms/resume-form";

interface CheckboxFieldProps {
	label: string;
}

export function CheckboxField({ label }: CheckboxFieldProps) {
	const field = useFieldContext<boolean>();

	return (
		<label className="flex items-center gap-2 text-sm">
			<input
				checked={field.state.value ?? false}
				onBlur={field.handleBlur}
				onChange={(event) => {
					field.handleChange(event.currentTarget.checked);
				}}
				type="checkbox"
			/>
			<span>{label}</span>
		</label>
	);
}

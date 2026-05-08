"use client";

import { useFieldContext } from "@/lib/forms/resume-form";

interface SelectFieldProps {
	emptyAsUndefined?: boolean;
	label: string;
	options: readonly string[];
}

export function SelectField({ emptyAsUndefined = false, label, options }: SelectFieldProps) {
	const field = useFieldContext<string | undefined>();

	return (
		<label className="flex min-w-0 flex-col gap-1">
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
			<select
				className="min-h-8 rounded-lg border border-transparent bg-transparent px-2 text-sm outline-none hover:border-input focus:border-ring focus:ring-[3px] focus:ring-ring/24"
				onBlur={field.handleBlur}
				onChange={(event) => {
					const next = event.currentTarget.value;
					field.handleChange(emptyAsUndefined && next === "" ? undefined : next);
				}}
				value={field.state.value ?? ""}
			>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		</label>
	);
}

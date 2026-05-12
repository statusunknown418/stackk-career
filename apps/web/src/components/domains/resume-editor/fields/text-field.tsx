"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { useFieldContext } from "@/lib/forms/resume-form";

interface TextFieldProps {
	"aria-label"?: string;
	className?: string;
	label?: string;
	placeholder?: string;
	variant?: "default" | "ghost";
}

export function TextField({
	className,
	label,
	"aria-label": ariaLabel,
	placeholder,
	variant = "default",
}: TextFieldProps) {
	const field = useFieldContext<string>();
	const id = useId();

	return (
		<label className="flex min-w-0 flex-col gap-1" htmlFor={id}>
			{label && <span className="font-medium text-muted-foreground text-xs uppercase">{label}</span>}

			<Input
				aria-label={label ? undefined : ariaLabel}
				className={className}
				id={id}
				nativeInput
				onBlur={field.handleBlur}
				onChange={(event) => {
					field.handleChange(event.currentTarget.value);
				}}
				placeholder={placeholder}
				value={field.state.value ?? ""}
				variant={variant}
			/>
		</label>
	);
}

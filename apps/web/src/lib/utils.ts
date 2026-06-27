import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * First value that carries meaning for display: trimmed, non-empty, and not a
 * known placeholder. Builds human-readable titles from a priority-ordered list
 * of fields, skipping blanks and generic defaults like "CV sin título".
 */
export function firstMeaningful(
	values: ReadonlyArray<string | null | undefined>,
	placeholders: readonly string[] = []
): string | undefined {
	for (const value of values) {
		const trimmed = value?.trim();
		if (trimmed && !placeholders.includes(trimmed)) {
			return trimmed;
		}
	}
	return;
}

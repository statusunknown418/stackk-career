"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
	maxDate?: Date;
	maxYear?: number;
	minYear?: number;
	onSelect: (date: Date) => void;
	selected: Date | undefined;
}

const MONTH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

const formatMonthLabel = (monthIndex: number) => {
	const label = format(new Date(2000, monthIndex, 1), "LLL", { locale: es });
	return label.charAt(0).toUpperCase() + label.slice(1, 3);
};

const monthLabels = MONTH_INDICES.map((index) => ({ index, label: formatMonthLabel(index) }));

export function MonthPicker({ maxDate, maxYear, minYear, onSelect, selected }: MonthPickerProps) {
	const now = new Date();
	const cappedMaxYear = Math.min(maxYear ?? now.getFullYear() + 5, maxDate?.getFullYear() ?? Number.POSITIVE_INFINITY);
	const defaultMaxYear = cappedMaxYear;
	const defaultMinYear = minYear ?? now.getFullYear() - 60;
	const maxYearForMonthGate = maxDate?.getFullYear();
	const maxMonthForMonthGate = maxDate?.getMonth();
	const selectedYear = selected?.getFullYear();
	const selectedMonth = selected?.getMonth();
	const [viewYear, setViewYear] = useState<number>(selectedYear ?? now.getFullYear());

	const yearOptions: { label: string; value: number }[] = [];
	for (let year = defaultMaxYear; year >= defaultMinYear; year--) {
		yearOptions.push({ label: String(year), value: year });
	}

	const handleYearChange = (next: string | number | null) => {
		if (next === null) {
			return;
		}
		const parsed = typeof next === "number" ? next : Number.parseInt(next, 10);
		if (!Number.isNaN(parsed)) {
			setViewYear(parsed);
		}
	};

	return (
		<div className="flex w-56 flex-col gap-2 py-2">
			<Select items={yearOptions} onValueChange={handleYearChange} value={viewYear}>
				<SelectTrigger>
					<SelectValue placeholder="Año" />
				</SelectTrigger>
				<SelectPopup>
					{yearOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>

			<div className="grid grid-cols-3 gap-2">
				{monthLabels.map(({ index, label }) => {
					const isSelected = selectedYear === viewYear && selectedMonth === index;
					const isBeyondMax =
						maxYearForMonthGate !== undefined &&
						maxMonthForMonthGate !== undefined &&
						(viewYear > maxYearForMonthGate || (viewYear === maxYearForMonthGate && index > maxMonthForMonthGate));
					return (
						<Button
							className={cn(
								"font-medium text-sm",
								isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
							)}
							disabled={isBeyondMax}
							key={index}
							onClick={() => onSelect(new Date(viewYear, index, 1))}
							size="sm"
							type="button"
							variant={isSelected ? "default" : "ghost"}
						>
							{label}
						</Button>
					);
				})}
			</div>
		</div>
	);
}

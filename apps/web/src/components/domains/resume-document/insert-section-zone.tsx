"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { NewSectionSheet } from "@/components/domains/resume-editor/new-section-sheet";
import { Button } from "@/components/ui/button";
import type { ResumeFormApi } from "@/lib/forms/resume-form";

interface InsertSectionZoneProps {
	form: ResumeFormApi;
	nextPosition: string | null;
	previousPosition: string | null;
}

export const InsertSectionZone = ({ form, nextPosition, previousPosition }: InsertSectionZoneProps) => {
	const [open, setOpen] = useState(false);

	return (
		<div className="group/zone relative my-1 flex h-2 items-center justify-center transition-all duration-150 focus-within:h-8 hover:h-8">
			<span
				aria-hidden="true"
				className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border opacity-0 transition-opacity duration-150 group-focus-within/zone:opacity-100 [@media(hover:hover)]:group-hover/zone:opacity-100"
			/>
			<div className="relative opacity-0 transition-opacity duration-150 group-focus-within/zone:opacity-100 [@media(hover:hover)]:group-hover/zone:opacity-100">
				<NewSectionSheet
					form={form}
					nextPosition={nextPosition}
					onOpenChange={setOpen}
					open={open}
					previousPosition={previousPosition}
					showTrigger={false}
				/>

				<Button aria-label="Insertar sección aquí" onClick={() => setOpen(true)} size="xs" type="button">
					<PlusIcon />
					Insertar sección
				</Button>
			</div>
		</div>
	);
};

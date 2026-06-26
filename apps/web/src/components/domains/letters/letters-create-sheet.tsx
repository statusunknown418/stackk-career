"use client";

import { Suspense } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { LettersCreateForm } from "./letters-create-form";

interface LettersCreateSheetProps {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}

/**
 * Slide-over creation surface for /letters. One scrollable form: pick a template, link a CV
 * (reusing its saved LinkedIn target when ready, or typing the role manually), choose the
 * language, then generate. Replaces the old two-step template-grid modal.
 */
export function LettersCreateSheet({ onOpenChange, open }: LettersCreateSheetProps) {
	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetPopup className="sm:max-w-xl" side="right">
				<SheetHeader>
					<SheetTitle>Nueva carta de presentación</SheetTitle>
					<SheetDescription>
						Elige un estilo y el CV base. Si el CV tiene una oferta de LinkedIn guardada, la reutilizamos; si no,
						escribe el puesto. CASEY redactará la carta.
					</SheetDescription>
				</SheetHeader>
				<SheetPanel>
					<Suspense fallback={<Shimmer>Cargando tus CVs…</Shimmer>}>
						<LettersCreateForm onClose={() => onOpenChange(false)} />
					</Suspense>
				</SheetPanel>
			</SheetPopup>
		</Sheet>
	);
}

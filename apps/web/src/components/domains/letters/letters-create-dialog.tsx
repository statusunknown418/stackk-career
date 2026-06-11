"use client";

import { Suspense } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@/components/ui/dialog";
import { LettersCreateForm } from "./letters-create-form";

interface LettersCreateDialogProps {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}

/**
 * Wraps the create-letter form in the standard coss Dialog primitives.
 * Identical chrome to ResumeCreateDialog (Dialog + DialogPopup + DialogHeader/Title/Description
 * + DialogPanel + DialogClose) so the two dialogs feel like siblings of the same family.
 */
export function LettersCreateDialog({ onOpenChange, open }: LettersCreateDialogProps) {
	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					onOpenChange(false);
				}
			}}
			open={open}
		>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Nueva carta de presentación</DialogTitle>
					<DialogDescription>
						Indica el puesto al que vas a postular y elige cuál CV usar como base. CASEY redactará la carta.
					</DialogDescription>
				</DialogHeader>

				<DialogPanel>
					<Suspense fallback={<Shimmer>Cargando tus CVs…</Shimmer>}>
						<LettersCreateForm onClose={() => onOpenChange(false)} />
					</Suspense>
				</DialogPanel>

				<DialogClose className="sr-only">Cerrar</DialogClose>
			</DialogPopup>
		</Dialog>
	);
}

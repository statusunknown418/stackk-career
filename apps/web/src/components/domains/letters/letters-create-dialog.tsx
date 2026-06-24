"use client";

import { PlusCircleIcon } from "@phosphor-icons/react";
import type { CoverLetterTemplate } from "@stackk-career/schemas/api/letters";
import { ArrowLeftIcon } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LettersCreateForm } from "./letters-create-form";
import { TemplateCard } from "./template-card";

interface LettersCreateDialogProps {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	template?: CoverLetterTemplate;
}

/**
 * Wraps the create-letter form in the standard coss Dialog primitives.
 * Provides a 2-step wizard if no template was pre-selected:
 * Step 1: Choose Template
 * Step 2: Enter Job Details Form
 */
export function LettersCreateDialog({ onOpenChange, open, template }: LettersCreateDialogProps) {
	const [activeTemplate, setActiveTemplate] = useState<CoverLetterTemplate>(undefined);
	const [step, setStep] = useState(1);

	// Synchronize internal state when the dialog is opened/closed
	useEffect(() => {
		if (open) {
			if (template === undefined) {
				setActiveTemplate(undefined);
				setStep(1);
			} else {
				setActiveTemplate(template);
				setStep(2);
			}
		}
	}, [open, template]);

	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					onOpenChange(false);
				}
			}}
			open={open}
		>
			<DialogPopup
				className={cn("transition-all duration-300 ease-in-out", step === 1 ? "sm:max-w-7xl" : "sm:max-w-lg")}
			>
				<DialogHeader>
					<div className="flex items-center gap-2">
						{step === 2 && template === undefined && (
							<Button
								className="-ml-2 h-8 w-8 rounded-full"
								onClick={() => setStep(1)}
								size="icon"
								type="button"
								variant="ghost"
							>
								<ArrowLeftIcon className="h-4 w-4" />
								<span className="sr-only">Volver</span>
							</Button>
						)}
						<DialogTitle>{step === 1 ? "Elige un estilo para tu carta" : "Nueva carta de presentación"}</DialogTitle>
					</div>
					<DialogDescription>
						{step === 1
							? "Selecciona una plantilla o empieza desde cero para abrir el asistente de creación."
							: "Indica el puesto al que vas a postular y elige cuál CV usar como base. CASEY redactará la carta."}
					</DialogDescription>
				</DialogHeader>

				<DialogPanel>
					{step === 1 ? (
						<div className="space-y-6">
							<div className="grid gap-6 md:grid-cols-2">
								{/* Formal Group */}
								<div className="flex flex-col gap-4 rounded-xl border bg-card/30 p-5 backdrop-blur-xs transition-all duration-300 hover:border-indigo-500/20 hover:bg-card/45 hover:shadow-indigo-500/[0.02] hover:shadow-xl">
									<div className="space-y-1">
										<h3 className="font-semibold text-base text-foreground">Formales</h3>
										<p className="text-muted-foreground text-xs leading-relaxed">
											Estructuras clásicas, limpias y profesionales que priorizan la sobriedad y van directo al grano.
										</p>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<TemplateCard
											author="Brian T. Wayne"
											onClick={() => {
												setActiveTemplate("centered");
												setStep(2);
											}}
											subtitle="COVER LETTER CENTERED"
											title="CLASSIC"
											type="centered"
										/>
										<TemplateCard
											author="Andrew O'Sullivan"
											onClick={() => {
												setActiveTemplate("classic");
												setStep(2);
											}}
											subtitle="COVER LETTER TEMPLATE"
											title="CLASSIC"
											type="classic"
										/>
									</div>
								</div>

								{/* Creative Group */}
								<div className="flex flex-col gap-4 rounded-xl border bg-card/30 p-5 backdrop-blur-xs transition-all duration-300 hover:border-emerald-500/20 hover:bg-card/45 hover:shadow-emerald-500/[0.02] hover:shadow-xl">
									<div className="space-y-1">
										<h3 className="font-semibold text-base text-foreground">Creativos</h3>
										<p className="text-muted-foreground text-xs leading-relaxed">
											Diseños dinámicos, modernos y visuales creados para destacar y demostrar tu originalidad.
										</p>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<TemplateCard
											author="Anna Field"
											onClick={() => {
												setActiveTemplate("minty");
												setStep(2);
											}}
											subtitle="MINIMALISTIC COVER LETTER"
											title="MINTY"
											type="minty"
										/>
										<TemplateCard
											author="Andrew O'Sullivan"
											onClick={() => {
												setActiveTemplate("blue");
												setStep(2);
											}}
											subtitle="MODERN COVER LETTER WITH BLUE..."
											title="BLUE CLASSIC"
											type="blue"
										/>
									</div>
								</div>
							</div>

							{/* Blank Template option */}
							<div className="flex flex-col gap-3 rounded-xl border bg-card/10 p-5 transition-all duration-300 hover:border-primary/20 hover:bg-card/20 hover:shadow-lg">
								<div className="space-y-1">
									<h3 className="font-semibold text-base text-foreground">En blanco</h3>
									<p className="text-muted-foreground text-xs leading-relaxed">
										Comienza con un lienzo despejado y dale forma de manera libre y personalizada.
									</p>
								</div>
								<div className="max-w-xs">
									<button
										className="group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-muted-foreground/25 border-dashed p-6 text-muted-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
										onClick={() => {
											setActiveTemplate(null);
											setStep(2);
										}}
										type="button"
									>
										<div className="rounded-full bg-muted p-2.5 transition-colors group-hover:bg-primary/10">
											<PlusCircleIcon className="transition-transform group-hover:scale-110" size={24} />
										</div>
										<span className="font-medium text-sm">Crear en blanco</span>
									</button>
								</div>
							</div>
						</div>
					) : (
						<Suspense fallback={<Shimmer>Cargando tus CVs…</Shimmer>}>
							<LettersCreateForm
								key={activeTemplate ?? "blank"}
								onClose={() => onOpenChange(false)}
								template={activeTemplate}
							/>
						</Suspense>
					)}
				</DialogPanel>

				<DialogClose className="sr-only">Cerrar</DialogClose>
			</DialogPopup>
		</Dialog>
	);
}

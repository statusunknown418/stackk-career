import { TargetIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { linkedinJobUrlSchema, parseLinkedinJobId } from "@stackk-career/schemas/api/resumes";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

const FORM_ID = "change-job-target-form";

const validateJobUrl = (value: string): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) {
		return "Pega el enlace de una oferta de LinkedIn.";
	}
	return parseLinkedinJobId(trimmed)
		? undefined
		: "Pega el enlace de una oferta de LinkedIn (ej. linkedin.com/jobs/view/...).";
};

const COPY = {
	add: {
		trigger: "Agregar objetivo",
		title: "Definir objetivo",
		description: "Pega el enlace de una oferta de LinkedIn para enfocar tu CV en ese puesto.",
		fieldLabel: "Oferta de LinkedIn",
		submit: "Agregar objetivo",
		success: "Objetivo agregado. Casey está leyendo la oferta…",
		error: "No pudimos agregar el objetivo.",
	},
	change: {
		trigger: "Cambiar objetivo",
		title: "Cambiar objetivo",
		description: "Pega el enlace de otra oferta de LinkedIn para re-enfocar tu CV en ese puesto.",
		fieldLabel: "Nueva oferta de LinkedIn",
		submit: "Cambiar objetivo",
		success: "Objetivo actualizado. Casey está leyendo la nueva oferta…",
		error: "No pudimos actualizar el objetivo.",
	},
} as const;

interface ResumeJobTargetChangeDialogProps {
	currentTitle?: string | null;
	/** `add` for resumes with no target yet (no destructive warning); `change` re-points an existing one. */
	mode?: "add" | "change";
	resumeId: string;
	triggerLabel?: string;
	triggerSize?: ButtonProps["size"];
	triggerVariant?: ButtonProps["variant"];
}

/**
 * Self-contained job-target action: a trigger button that opens a modal to point the resume at a
 * LinkedIn job posting. `mode="add"` (no existing target) drops the destructive warning and uses
 * "agregar" copy; `mode="change"` re-points an existing target and warns the analysis resets.
 * On success it invalidates the job-target query so the editor panel flips to its "fetching" state
 * and polls until the posting is ready.
 */
export function ResumeJobTargetChangeDialog({
	resumeId,
	currentTitle,
	mode = "change",
	triggerLabel,
	triggerSize = "sm",
	triggerVariant = "outline",
}: ResumeJobTargetChangeDialogProps): React.ReactElement {
	const copy = COPY[mode];
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const jobTargetQueryKey = orpc.resumes.getJobTarget.queryOptions({ input: { resumeId } }).queryKey;

	const changeMutation = useMutation(
		orpc.resumes.changeJobTarget.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: jobTargetQueryKey });
				toast.success(copy.success);
				setOpen(false);
			},
			onError: (error) => {
				toast.error(error.message || copy.error);
			},
		})
	);

	const form = useForm({
		defaultValues: { targetJobUrl: "" },
		onSubmit: ({ value }) => {
			const parsed = linkedinJobUrlSchema.safeParse(value.targetJobUrl);
			if (!parsed.success) {
				return;
			}
			changeMutation.mutate({ resumeId, targetJobUrl: parsed.data });
		},
	});

	return (
		<Dialog
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					form.reset();
				}
			}}
			open={open}
		>
			<DialogTrigger render={<Button className="w-full" size={triggerSize} variant={triggerVariant} />}>
				<TargetIcon />
				{triggerLabel ?? copy.trigger}
			</DialogTrigger>

			<DialogPopup>
				<DialogHeader>
					<DialogTitle>{copy.title}</DialogTitle>
					<DialogDescription>{copy.description}</DialogDescription>
				</DialogHeader>

				<DialogPanel>
					<form
						className="flex flex-col gap-4"
						id={FORM_ID}
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						{mode === "change" && (
							<Alert variant="warning">
								<WarningCircleIcon />
								<AlertTitle>Esto cambia por completo el análisis</AlertTitle>
								<AlertDescription>
									Casey reemplazará el puesto actual
									{currentTitle ? ` (${currentTitle})` : ""} y volverá a leer la nueva oferta. Las próximas puntuaciones
									y sugerencias se basarán únicamente en este nuevo objetivo.
								</AlertDescription>
							</Alert>
						)}

						<form.Field
							name="targetJobUrl"
							validators={{
								onBlur: ({ value }) => validateJobUrl(value),
								onChange: ({ value }) => validateJobUrl(value),
							}}
						>
							{(field) => {
								const error = field.state.meta.errors[0];
								return (
									<Field>
										<FieldLabel htmlFor="change-job-target-url">{copy.fieldLabel}</FieldLabel>
										<Input
											autoFocus
											disabled={changeMutation.isPending}
											id="change-job-target-url"
											inputMode="url"
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="https://www.linkedin.com/jobs/view/..."
											value={field.state.value}
										/>

										{error?.length ? (
											<FieldError>{error}</FieldError>
										) : (
											<FieldDescription>
												Sincronizaremos ese puesto para personalizar el análisis y las sugerencias.
											</FieldDescription>
										)}
									</Field>
								);
							}}
						</form.Field>
					</form>
				</DialogPanel>

				<DialogFooter>
					<Button render={<DialogClose />} variant="outline">
						Cancelar
					</Button>
					<form.Subscribe selector={(state) => state.values.targetJobUrl}>
						{(url) => (
							<Button
								disabled={validateJobUrl(url) !== undefined}
								form={FORM_ID}
								loading={changeMutation.isPending}
								type="submit"
							>
								<TargetIcon />
								{copy.submit}
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

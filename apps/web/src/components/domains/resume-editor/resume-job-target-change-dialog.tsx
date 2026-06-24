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

interface ResumeJobTargetChangeDialogProps {
	currentTitle?: string | null;
	resumeId: string;
	triggerLabel?: string;
	triggerSize?: ButtonProps["size"];
	triggerVariant?: ButtonProps["variant"];
}

/**
 * Self-contained "Cambiar objetivo" action: a trigger button that opens a modal to point the
 * resume at a different LinkedIn job posting. On success it invalidates the job-target query so
 * the editor panel flips to its "fetching" state and polls until the new posting is ready.
 */
export function ResumeJobTargetChangeDialog({
	resumeId,
	currentTitle,
	triggerLabel = "Cambiar objetivo",
	triggerSize = "sm",
	triggerVariant = "outline",
}: ResumeJobTargetChangeDialogProps): React.ReactElement {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const jobTargetQueryKey = orpc.resumes.getJobTarget.queryOptions({ input: { resumeId } }).queryKey;

	const changeMutation = useMutation(
		orpc.resumes.changeJobTarget.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: jobTargetQueryKey });
				toast.success("Objetivo actualizado. Casey está leyendo la nueva oferta…");
				setOpen(false);
			},
			onError: (error) => {
				toast.error(error.message || "No pudimos actualizar el objetivo.");
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
				{triggerLabel}
			</DialogTrigger>

			<DialogPopup>
				<DialogHeader>
					<DialogTitle>Cambiar objetivo</DialogTitle>
					<DialogDescription>
						Pega el enlace de otra oferta de LinkedIn para re-enfocar tu CV en ese puesto.
					</DialogDescription>
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
						<Alert variant="warning">
							<WarningCircleIcon />
							<AlertTitle>Esto cambia por completo el análisis</AlertTitle>
							<AlertDescription>
								Casey reemplazará el puesto actual
								{currentTitle ? ` (${currentTitle})` : ""} y volverá a leer la nueva oferta. Las próximas puntuaciones y
								sugerencias se basarán únicamente en este nuevo objetivo.
							</AlertDescription>
						</Alert>

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
										<FieldLabel htmlFor="change-job-target-url">Nueva oferta de LinkedIn</FieldLabel>
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
								Cambiar objetivo
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

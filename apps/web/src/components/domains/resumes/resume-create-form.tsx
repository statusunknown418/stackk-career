import { createResumeInputSchema } from "@stackk-career/schemas/api/resumes";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

interface ResumeCreateFormProps {
	onClose: () => void;
	onParseStart: (runId: string) => void;
}

const getResumeLabelError = (value: string): string | undefined => {
	const parsed = createResumeInputSchema.shape.label.safeParse(value);
	return parsed.success ? undefined : (parsed.error.issues[0]?.message ?? "Etiqueta inválida");
};

const parseResumeLabel = (value: string): string | undefined => {
	const parsed = createResumeInputSchema.shape.label.safeParse(value);
	return parsed.success ? parsed.data : undefined;
};

const readFieldError = (error: unknown): string | null => {
	if (typeof error === "string") {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return error == null ? null : String(error);
};

export function ResumeCreateForm({ onClose, onParseStart }: ResumeCreateFormProps): React.ReactElement {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const createBlankMutation = useMutation(
		orpc.resumes.create.mutationOptions({
			onSuccess: ({ resumeId }) => {
				queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() });
				onClose();
				navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
			},
			onError: (err) => toast.error(err.message),
		})
	);
	const parseMutation = useMutation(
		orpc.agents.triggerK02ParseResume.mutationOptions({
			onSuccess: ({ runId }) => onParseStart(runId),
			onError: (err) => toast.error(err.message),
		})
	);

	const form = useForm({
		defaultValues: {
			label: "",
		},
		onSubmit: ({ value }) => {
			createBlankMutation.mutate({ label: createResumeInputSchema.parse(value).label });
		},
	});

	return (
		<form
			className="flex flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.Field
				name="label"
				validators={{
					onBlur: ({ value }) => getResumeLabelError(value),
					onChange: ({ value }) => getResumeLabelError(value),
					onSubmit: ({ value }) => getResumeLabelError(value),
				}}
			>
				{(field) => {
					const showLabelError = field.state.meta.isTouched || form.state.submissionAttempts > 0;
					const labelError = showLabelError ? readFieldError(field.state.meta.errors[0]) : null;

					return (
						<Field>
							<FieldLabel htmlFor="resume-label">Titulo</FieldLabel>
							<Input
								autoFocus
								disabled={createBlankMutation.isPending || parseMutation.isPending}
								id="resume-label"
								maxLength={120}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Ej. Senior Product Manager - 2026"
								value={field.state.value}
							/>
							{labelError && <FieldError>{labelError}</FieldError>}
						</Field>
					);
				}}
			</form.Field>

			<section className="flex flex-col gap-3">
				<p className="text-muted-foreground text-sm">
					Sube un PDF y dejaremos que el agente extraiga las secciones automáticamente. O créalo en blanco.
				</p>

				<form.Subscribe
					selector={(state) => ({
						isSubmitting: state.isSubmitting,
						label: state.values.label,
					})}
				>
					{({ isSubmitting, label }) => {
						const parsedLabel = parseResumeLabel(label);
						const isBusy = isSubmitting || createBlankMutation.isPending || parseMutation.isPending;

						return (
							<Dropzone<{ generationId: string | undefined }>
								autoUpload
								disabled={isBusy || !parsedLabel}
								endpoint="resumeUploader"
								input={{ generationId: undefined }}
								onClientUploadComplete={(files) => {
									const fileId = files.at(0)?.serverData.storedId;
									if (!fileId) {
										toast.error("No pudimos registrar el archivo. Intenta de nuevo.");
										return;
									}
									if (!parsedLabel) {
										toast.error("Agrega un título válido antes de subir el archivo.");
										return;
									}
									parseMutation.mutate({ fileId, displayName: parsedLabel });
								}}
								onUploadError={(err) => toast.error(err.message)}
							/>
						);
					}}
				</form.Subscribe>
			</section>

			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
					label: state.values.label,
				})}
			>
				{({ canSubmit, isSubmitting, label }) => (
					<Button
						disabled={
							isSubmitting ||
							createBlankMutation.isPending ||
							parseMutation.isPending ||
							!canSubmit ||
							!parseResumeLabel(label)
						}
						type="submit"
						variant="outline"
					>
						Crear en blanco
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

import { WarningCircleIcon } from "@phosphor-icons/react";
import { usePostHog } from "@posthog/react";
import { createResumeInputSchema, parseLinkedinJobId } from "@stackk-career/schemas/api/resumes";
import { hasQuotaRemaining } from "@stackk-career/schemas/subscriptions";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { invalidateBillingQueries } from "@/lib/billing-cache";
import { orpc } from "@/utils/orpc";

interface ResumeCreateFormProps {
	onClose: () => void;
	onParseStart: (runId: string, hasTargetJobUrl: boolean) => void;
}

const parseTargetRole = (value: string): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) {
		return;
	}
	const parsed = createResumeInputSchema.shape.targetRole.safeParse(trimmed);
	return parsed.success ? parsed.data : undefined;
};

const parseJobUrl = (value: string): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) {
		return;
	}
	const parsed = createResumeInputSchema.shape.targetJobUrl.safeParse(trimmed);
	return parsed.success ? parsed.data : undefined;
};

const validateJobUrl = (value: string): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) {
		return;
	}
	return parseLinkedinJobId(trimmed)
		? undefined
		: "Pega el enlace de una oferta de LinkedIn (ej. linkedin.com/jobs/view/...)";
};

export function ResumeCreateForm({ onClose, onParseStart }: ResumeCreateFormProps): React.ReactElement {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const posthog = usePostHog();
	const snapshot = useQuery(orpc.billing.getSnapshot.queryOptions()).data;
	// AI-from-PDF parsing consumes the per-cycle resume-creation quota; manual "desde cero" does not.
	const canUseAi =
		snapshot == null ||
		hasQuotaRemaining(
			snapshot.entitlements.resume_creation_generations_per_cycle,
			snapshot.usage.resume_creation_generations_per_cycle
		);
	const createBlankMutation = useMutation(
		orpc.resumes.create.mutationOptions({
			onSuccess: async ({ resumeId }) => {
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() }),
					invalidateBillingQueries(queryClient),
				]);
				onClose();
				navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
			},
			onError: (err) => toast.error(err.message),
		})
	);
	const parseMutation = useMutation(
		orpc.agents.triggerK02ParseResume.mutationOptions({
			onSuccess: ({ runId }, variables) => onParseStart(runId, variables.targetJobUrl !== undefined),
			onError: (err) => toast.error(err.message),
		})
	);

	const form = useForm({
		defaultValues: {
			targetRole: "",
			targetJobUrl: "",
		},
		onSubmit: ({ value }) => {
			createBlankMutation.mutate({
				targetRole: parseTargetRole(value.targetRole),
				targetJobUrl: parseJobUrl(value.targetJobUrl),
			});
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
				name="targetJobUrl"
				validators={{
					onBlur: ({ value }) => validateJobUrl(value),
					onChange: ({ value }) => validateJobUrl(value),
				}}
			>
				{(field) => {
					const error = field.state.meta.errors[0];
					const hasValue = field.state.value.trim().length > 0;
					return (
						<Field>
							<FieldLabel htmlFor="resume-target-job-url">
								Oferta de LinkedIn
								<Badge size="sm" variant="info">
									Contexto recomendado
								</Badge>
							</FieldLabel>
							<Input
								autoFocus
								disabled={createBlankMutation.isPending || parseMutation.isPending}
								id="resume-target-job-url"
								inputMode="url"
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="https://www.linkedin.com/jobs/view/..."
								value={field.state.value}
							/>
							{error ? (
								<FieldError>{error}</FieldError>
							) : (
								<FieldDescription>
									{hasValue
										? "Sincronizaremos ese puesto para personalizar las sugerencias del editor."
										: "Úsala cuando ya sabes a qué puesto vas a aplicar."}
								</FieldDescription>
							)}
						</Field>
					);
				}}
			</form.Field>

			<form.Field name="targetRole">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="resume-target-role">
							Puesto objetivo
							<Badge size="sm" variant="outline">
								Opcional
							</Badge>
						</FieldLabel>
						<Input
							disabled={createBlankMutation.isPending || parseMutation.isPending}
							id="resume-target-role"
							maxLength={120}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Ej. Senior Product Manager"
							value={field.state.value}
						/>
						<FieldDescription>Úsalo si no tienes una oferta de LinkedIn definida aún.</FieldDescription>
					</Field>
				)}
			</form.Field>

			<Separator />

			<section aria-labelledby="resume-pdf-upload-title" className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="text-foreground text-sm" id="resume-pdf-upload-title">
						CV actual
					</h3>
					<Badge size="sm" variant="info">
						Importa tu experiencia
					</Badge>
				</div>

				{canUseAi ? (
					<p className="text-muted-foreground text-sm">Adjunta tu PDF para mejorarlo con Casey</p>
				) : (
					<Alert variant="warning">
						<WarningCircleIcon />
						<AlertTitle>Límite de generaciones con IA alcanzado</AlertTitle>
						<AlertDescription>
							Usaste todas las generaciones con IA de este ciclo. Aún puedes pegar una oferta de LinkedIn y crear un CV
							en blanco.
						</AlertDescription>
					</Alert>
				)}

				<form.Subscribe selector={(state) => state.values}>
					{(values) => {
						const parsedRole = parseTargetRole(values.targetRole);
						const parsedJobUrl = parseJobUrl(values.targetJobUrl);
						const jobUrlInvalid = values.targetJobUrl.trim().length > 0 && parsedJobUrl === undefined;
						const isBusy = createBlankMutation.isPending || parseMutation.isPending;

						return (
							<Dropzone<{ generationId: string | undefined }>
								disabled={isBusy || !canUseAi || jobUrlInvalid}
								endpoint="resumeUploader"
								input={{ generationId: undefined }}
								onClientUploadComplete={(files) => {
									const fileId = files.at(0)?.serverData.storedId;
									if (!fileId) {
										toast.error("No pudimos registrar el archivo. Intenta de nuevo.");
										return;
									}
									parseMutation.mutate({ fileId, displayName: parsedRole, targetJobUrl: parsedJobUrl });
									posthog?.capture("resume_uploaded", { context: "dash" });
								}}
								onUploadError={(err) => toast.error(err.message)}
								uploadButtonLabel="Continuar con este PDF"
							/>
						);
					}}
				</form.Subscribe>
			</section>

			<Separator />

			<section aria-labelledby="resume-blank-create-title" className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="text-foreground text-sm" id="resume-blank-create-title">
						No tengo un PDF ahora
					</h3>
					<Badge size="sm" variant="outline">
						Alternativa
					</Badge>
				</div>
				<p className="text-muted-foreground text-sm">
					Crea un CV en blanco. Si pegaste una oferta de LinkedIn, Casey usará ese contexto en el editor.
				</p>
				<form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
					{({ canSubmit, isSubmitting }) => (
						<Button
							disabled={!canSubmit || isSubmitting || createBlankMutation.isPending || parseMutation.isPending}
							loading={isSubmitting || createBlankMutation.isPending}
							type="submit"
							variant="outline"
						>
							Crear CV en blanco
						</Button>
					)}
				</form.Subscribe>
			</section>
		</form>
	);
}

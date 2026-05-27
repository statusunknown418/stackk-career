import { createResumeInputSchema } from "@stackk-career/schemas/api/resumes";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/utils/orpc";

interface ResumeCreateFormProps {
	onClose: () => void;
	onParseStart: (runId: string) => void;
}

const parseTargetRole = (value: string): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) {
		return;
	}
	const parsed = createResumeInputSchema.shape.targetRole.safeParse(trimmed);
	return parsed.success ? parsed.data : undefined;
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
			targetRole: "",
		},
		onSubmit: ({ value }) => {
			createBlankMutation.mutate({ targetRole: parseTargetRole(value.targetRole) });
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
			<form.Field name="targetRole">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="resume-target-role">Puesto objetivo</FieldLabel>
						<Input
							autoFocus
							disabled={createBlankMutation.isPending || parseMutation.isPending}
							id="resume-target-role"
							maxLength={120}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Ej. Senior Product Manager"
							value={field.state.value}
						/>
						<FieldDescription>
							Opcional. Lo usaremos para adaptar el contenido. Lo puedes cambiar después.
						</FieldDescription>
					</Field>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button disabled={isSubmitting || createBlankMutation.isPending || parseMutation.isPending} type="submit">
						{isSubmitting && <Loader />}
						Crear desde cero
					</Button>
				)}
			</form.Subscribe>

			<Separator />

			<section className="flex flex-col gap-3">
				<p className="text-muted-foreground text-sm">
					También puedes subir un PDF y dejaremos que el agente extraiga las secciones automáticamente.
				</p>

				<form.Subscribe selector={(state) => state.values.targetRole}>
					{(targetRole) => {
						const parsedRole = parseTargetRole(targetRole);
						const isBusy = createBlankMutation.isPending || parseMutation.isPending;

						return (
							<Dropzone<{ generationId: string | undefined }>
								autoUpload
								disabled={isBusy}
								endpoint="resumeUploader"
								input={{ generationId: undefined }}
								onClientUploadComplete={(files) => {
									const fileId = files.at(0)?.serverData.storedId;
									if (!fileId) {
										toast.error("No pudimos registrar el archivo. Intenta de nuevo.");
										return;
									}
									parseMutation.mutate({ fileId, displayName: parsedRole });
								}}
								onUploadError={(err) => toast.error(err.message)}
							/>
						);
					}}
				</form.Subscribe>
			</section>
		</form>
	);
}

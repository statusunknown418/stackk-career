import { createResumeInputSchema } from "@stackk-career/schemas/api/resumes";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ResumeCreateFormProps {
	disabled?: boolean;
	onCreateBlank: (args: { label: string }) => void;
	onParse: (args: { fileId: string; label: string }) => void;
}

export function ResumeCreateForm({ disabled, onCreateBlank, onParse }: ResumeCreateFormProps): React.ReactElement {
	const [label, setLabel] = useState("");
	const [touched, setTouched] = useState(false);

	const parsed = createResumeInputSchema.safeParse({ label });
	const labelError = !parsed.success && touched ? (parsed.error.issues[0]?.message ?? "Etiqueta inválida") : null;
	const isLabelValid = parsed.success;

	const handleBlankSubmit = () => {
		setTouched(true);
		if (!isLabelValid) {
			return;
		}
		onCreateBlank({ label: parsed.data.label });
	};

	return (
		<form
			className="flex flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				handleBlankSubmit();
			}}
		>
			<Field>
				<FieldLabel htmlFor="resume-label">Nombre del CV</FieldLabel>
				<Input
					autoFocus
					disabled={disabled}
					id="resume-label"
					maxLength={120}
					onBlur={() => setTouched(true)}
					onChange={(e) => setLabel(e.target.value)}
					placeholder="Ej. Senior Product Manager - 2026"
					value={label}
				/>
				{labelError && <FieldError>{labelError}</FieldError>}
			</Field>

			<section className="flex flex-col gap-3">
				<p className="text-muted-foreground text-sm">
					Sube un PDF y dejaremos que el agente extraiga las secciones automáticamente. O créalo en blanco.
				</p>

				<Dropzone<{ generationId: string | undefined }>
					disabled={disabled || !isLabelValid}
					endpoint="resumeUploader"
					input={{ generationId: undefined }}
					onClientUploadComplete={(files) => {
						const fileId = files.at(0)?.serverData.storedId;
						if (!fileId) {
							toast.error("No pudimos registrar el archivo. Intenta de nuevo.");
							return;
						}
						onParse({ fileId, label: parsed.success ? parsed.data.label : label.trim() });
					}}
					onUploadError={(err) => toast.error(err.message)}
				/>
			</section>

			<Button disabled={disabled || !isLabelValid} type="submit" variant="outline">
				Crear sin PDF
			</Button>
		</form>
	);
}

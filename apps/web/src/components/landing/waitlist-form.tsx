"use client";

import { CheckCircleIcon, EnvelopeSimpleIcon, UserIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { orpc } from "@/utils/orpc";

/** Captura de waitlist en /waitlist: nombre + teléfono (WhatsApp) + email para avisar al lanzar. */
export function WaitlistForm() {
	const join = useMutation(
		orpc.waitlist.join.mutationOptions({
			onError: (error) => toast.error(error.message),
		})
	);

	const form = useForm({
		defaultValues: { name: "", phone: "", email: "" },
		onSubmit: ({ value }) => {
			join.mutate({
				name: value.name.trim(),
				phone: value.phone.trim(),
				email: value.email.trim() || undefined,
			});
		},
	});

	if (join.isSuccess) {
		return (
			<div className="mt-10 flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-oxblood/30 bg-oxblood/10 px-6 py-8 text-center">
				<CheckCircleIcon className="text-oxblood" size={32} weight="fill" />
				<p className="font-medium text-foreground">¡Listo! Estás en la lista.</p>
				<p className="text-foreground/70 text-sm">Te escribimos a tu WhatsApp apenas lancemos.</p>
			</div>
		);
	}

	return (
		<form
			className="mt-10 flex w-full max-w-sm flex-col gap-2.5 text-left"
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.Field name="name">
				{(field) => (
					<InputGroup>
						<InputGroupInput
							aria-label="Tu nombre"
							autoComplete="name"
							disabled={join.isPending}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="Tu nombre"
							required
							value={field.state.value}
						/>
						<InputGroupAddon>
							<UserIcon aria-hidden="true" />
						</InputGroupAddon>
					</InputGroup>
				)}
			</form.Field>

			<form.Field name="phone">
				{(field) => (
					<InputGroup>
						<InputGroupInput
							aria-label="Tu celular (WhatsApp)"
							autoComplete="tel"
							disabled={join.isPending}
							inputMode="tel"
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="Tu celular (WhatsApp)"
							type="tel"
							value={field.state.value}
						/>
						<InputGroupAddon>
							<WhatsappLogoIcon aria-hidden="true" />
						</InputGroupAddon>
					</InputGroup>
				)}
			</form.Field>

			<form.Field name="email">
				{(field) => (
					<InputGroup>
						<InputGroupInput
							aria-label="Tu correo (opcional)"
							autoComplete="email"
							disabled={join.isPending}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="Tu correo (opcional)"
							type="email"
							value={field.state.value}
						/>
						<InputGroupAddon>
							<EnvelopeSimpleIcon aria-hidden="true" />
						</InputGroupAddon>
					</InputGroup>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button className="mt-1 w-full" disabled={isSubmitting || join.isPending} size="lg" type="submit">
						{(isSubmitting || join.isPending) && <Loader />}
						Avísame del lanzamiento
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

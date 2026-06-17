import { CalendarBlankIcon, CheckCircleIcon, EnvelopeSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetPanel,
	SheetPopup,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useProfileSheet } from "./use-profile-sheet";

/** Authenticated session exactly as the better-auth client infers it. */
type Session = typeof authClient.$Infer.Session;

const WHITESPACE = /\s+/;
const NAME_MAX_LENGTH = 64;

function avatarInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}
	const first = parts[0].charAt(0);
	const last = parts.length > 1 ? (parts.at(-1) ?? "").charAt(0) : "";
	return (first + last).toUpperCase();
}

function formatMemberSince(value: Date | string): string {
	return format(new Date(value), "d 'de' MMMM, yyyy", { locale: es });
}

export function ProfileSheet(): React.ReactElement {
	const open = useProfileSheet((state) => state.open);
	const closeProfileSheet = useProfileSheet((state) => state.closeProfileSheet);

	return (
		<Sheet
			onOpenChange={(next) => {
				if (!next) {
					closeProfileSheet();
				}
			}}
			open={open}
		>
			<SheetPopup side="right">{open ? <ProfileSheetContent /> : null}</SheetPopup>
		</Sheet>
	);
}

function ProfileSkeleton(): React.ReactElement {
	return (
		<div className="flex flex-col gap-7">
			<div className="flex items-center gap-4">
				<Skeleton className="size-14 rounded-full" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-5 w-36" />
					<Skeleton className="h-3.5 w-48" />
				</div>
			</div>
			<Skeleton className="h-9 w-full" />
			<Skeleton className="h-16 w-full rounded-xl" />
		</div>
	);
}

function ProfileForm({ user }: { user: Session["user"] }): React.ReactElement {
	const { refetch } = authClient.useSession();
	const [name, setName] = useState(user.name);
	const [saving, setSaving] = useState(false);

	const trimmedName = name.trim();
	const isDirty = trimmedName !== user.name;
	const canSave = isDirty && trimmedName.length > 0 && !saving;

	const save = async () => {
		setSaving(true);
		const { error } = await authClient.updateUser({ name: trimmedName });
		setSaving(false);

		if (error) {
			toast.error(error.message ?? "No pudimos guardar los cambios.");
			return;
		}

		refetch();
		toast.success("Tu perfil fue actualizado.");
	};

	return (
		<>
			<SheetPanel>
				<div className="flex flex-col gap-7">
					<div className="flex items-center gap-4">
						<Avatar className="size-14">
							{user.image && <AvatarImage alt={user.name} src={user.image} />}
							<AvatarFallback className="text-sm">{avatarInitials(user.name)}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-col gap-1">
							<span className="truncate font-heading text-xl leading-none">{user.name}</span>
							<span className="truncate text-muted-foreground text-sm">{user.email}</span>
						</div>
					</div>

					<Field>
						<FieldLabel>Nombre</FieldLabel>
						<Input maxLength={NAME_MAX_LENGTH} onValueChange={setName} placeholder="Tu nombre" value={name} />
					</Field>

					<Separator />

					<div className="flex flex-col gap-3.5">
						<span className="font-medium text-muted-foreground text-sm">Cuenta</span>

						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="inline-flex items-center gap-2 text-muted-foreground">
								<EnvelopeSimpleIcon className="size-4 shrink-0" />
								Correo
							</span>
							<span className="inline-flex items-center gap-1.5">
								{user.email}
								<Badge size="sm" variant={user.emailVerified ? "success" : "warning"}>
									{user.emailVerified ? (
										<>
											<CheckCircleIcon weight="fill" />
											Verificado
										</>
									) : (
										<>
											<WarningCircleIcon weight="fill" />
											Sin verificar
										</>
									)}
								</Badge>
							</span>
						</div>

						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="inline-flex items-center gap-2 text-muted-foreground">
								<CalendarBlankIcon className="size-4 shrink-0" />
								Miembro desde
							</span>
							<span className="text-foreground tabular-nums">{formatMemberSince(user.createdAt)}</span>
						</div>
					</div>
				</div>
			</SheetPanel>

			<SheetFooter className="flex-col sm:flex-col sm:items-stretch sm:justify-start">
				<Button disabled={!canSave} loading={saving} onClick={save} size="lg">
					Guardar cambios
				</Button>
			</SheetFooter>
		</>
	);
}

function ProfileSheetContent(): React.ReactElement {
	const { data: session, isPending } = authClient.useSession();

	return (
		<>
			<SheetHeader>
				<SheetTitle>Mi perfil</SheetTitle>
				<SheetDescription>Administra tu cuenta y tus datos personales.</SheetDescription>
			</SheetHeader>

			{isPending && (
				<SheetPanel>
					<ProfileSkeleton />
				</SheetPanel>
			)}

			{!(isPending || session) && (
				<SheetPanel>
					<p className="text-muted-foreground text-sm">No pudimos cargar tu sesión. Inténtalo de nuevo.</p>
				</SheetPanel>
			)}

			{session && <ProfileForm user={session.user} />}
		</>
	);
}

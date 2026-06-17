import { CreditCardIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useBillingSheet } from "./domains/billing/use-billing-sheet";
import { useProfileSheet } from "./domains/profile/use-profile-sheet";
import { Avatar } from "./ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/menu";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton } from "./ui/sidebar";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const openBillingSheet = useBillingSheet((state) => state.openBillingSheet);
	const openProfileSheet = useProfileSheet((state) => state.openProfileSheet);

	if (isPending) {
		return <Skeleton className="h-8 w-full" />;
	}

	if (!session) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton>
					<SidebarMenuSkeleton />
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	const image = session.user.image;

	return (
		<SidebarMenuItem>
			<DropdownMenu>
				<DropdownMenuTrigger render={<SidebarMenuButton />}>
					{image && (
						<Avatar className="size-4">
							<img alt={session.user.name} height={24} src={image} width={24} />
						</Avatar>
					)}
					{session.user.name}
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="w-50" side="right">
					<DropdownMenuGroup>
						<DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => openProfileSheet()}>
							<UserCircleIcon />
							Mi perfil
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => openBillingSheet()}>
							<CreditCardIcon />
							Suscripción
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => {
								authClient.signOut({
									fetchOptions: {
										onSuccess: () => {
											navigate({ to: "/" });
										},
									},
								});
							}}
							variant="destructive"
						>
							<SignOutIcon />
							Cerrar sesión
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);
}

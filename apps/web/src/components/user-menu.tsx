import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
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
				<DropdownMenuContent>
					<DropdownMenuGroup>
						<DropdownMenuLabel>Cuenta</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>{session.user.email}</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								authClient.signOut({
									fetchOptions: {
										onSuccess: () => {
											navigate({
												to: "/",
											});
										},
									},
								});
							}}
							variant="destructive"
						>
							Sign Out
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);
}

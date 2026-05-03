import { BriefcaseIcon, ChatsIcon, GearIcon, PaperPlaneIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { careerWorkspaceNavigation } from "@/components/domains/dashboard/career-workspace-navigation";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import UserMenu from "@/components/user-menu";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash")({
	component: DashLayout,
	beforeLoad: async () => queryClient.ensureQueryData(orpc.generations.list.queryOptions()),
});

function DashLayout() {
	const matchRoute = useLocation();
	const { data } = useSuspenseQuery(orpc.generations.list.queryOptions());

	return (
		<SidebarProvider>
			<Sidebar collapsible="icon" variant="inset">
				<SidebarHeader>
					<SidebarMenuButton size="md">
						<BriefcaseIcon />
						STK Career
					</SidebarMenuButton>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Generaciones</SidebarGroupLabel>

						<SidebarGroupContent>
							<SidebarMenu>
								{data.map((gen) => (
									<SidebarMenuItem key={gen.id}>
										<SidebarMenuButton>
											<PaperPlaneIcon />
											{gen.title}
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>

					<SidebarGroup>
						<SidebarGroupLabel>Navegación</SidebarGroupLabel>

						<SidebarGroupContent>
							<SidebarMenu className="gap-1.5">
								{careerWorkspaceNavigation.map((item) => {
									const isActive = item.to === matchRoute.pathname;

									return (
										<SidebarMenuItem key={item.id}>
											<SidebarMenuButton isActive={isActive} render={<Link to={item.to} />} tooltip={item.label}>
												<item.icon />
												<span>{item.label}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter>
					<SidebarMenu>
						<SidebarGroupLabel>Extras</SidebarGroupLabel>
						<SidebarMenuItem>
							<SidebarMenuButton>
								<GearIcon />
								Configuración
							</SidebarMenuButton>
						</SidebarMenuItem>

						<UserMenu />
					</SidebarMenu>
				</SidebarFooter>

				<SidebarRail />
			</Sidebar>

			<SidebarInset className="grid grid-rows-[auto_1fr] rounded-sm border">
				<nav className="flex justify-between border-b px-2 py-1">
					<Button render={<SidebarTrigger />} size="icon-sm" variant="ghost">
						<SidebarSimpleIcon weight="duotone" />
						Sidebar
					</Button>

					<Button size="icon-sm" variant="ghost">
						<ChatsIcon weight="duotone" />
					</Button>
				</nav>

				<Outlet />
			</SidebarInset>

			<Sidebar side="right" variant="inset">
				<SidebarHeader>
					<SidebarMenuButton size="md">Chats</SidebarMenuButton>
				</SidebarHeader>
			</Sidebar>
		</SidebarProvider>
	);
}

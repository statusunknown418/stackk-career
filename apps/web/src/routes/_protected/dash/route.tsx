import { BriefcaseIcon, ChatsIcon, GearIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { careerWorkspaceNavigation } from "@/components/domains/dashboard/career-workspace-navigation";
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
import { getSidebarState } from "@/functions/get-sidebar-state";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash")({
	component: DashLayout,
	beforeLoad: async () => queryClient.ensureQueryData(orpc.generations.list.queryOptions()),
	loader: () => getSidebarState(),
});

function DashLayout() {
	const matchRoute = useLocation();
	const { data } = useSuspenseQuery(orpc.generations.list.queryOptions());
	const sidebarState = Route.useLoaderData();

	return (
		<SidebarProvider defaultOpenLeft={sidebarState.left} defaultOpenRight={sidebarState.right}>
			<Sidebar className="pl-0.5" collapsible="icon" variant="inset">
				<SidebarHeader>
					<SidebarMenuButton size="md">
						<BriefcaseIcon />
						STK Career
					</SidebarMenuButton>
				</SidebarHeader>

				<SidebarContent>
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
					<SidebarTrigger size="sm" variant="ghost-muted">
						<SidebarSimpleIcon weight="duotone" />
						Nav
					</SidebarTrigger>

					<SidebarTrigger side="right" size="sm" variant="ghost-muted">
						<ChatsIcon weight="duotone" />
						Chats
					</SidebarTrigger>
				</nav>

				<Outlet />
			</SidebarInset>

			<Sidebar className="px-0" collapsible="offcanvas" side="right" variant="inset">
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Generaciones</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu className="gap-0">
								{data.length === 0 ? (
									<li className="px-2 py-1 text-muted-foreground text-xs">No hay chats</li>
								) : (
									data.map((gen) => (
										<SidebarMenuItem key={gen.id}>
											<SidebarMenuButton tooltip={gen.summary ?? gen.title ?? "Sin titulo"}>
												<span className="truncate">{gen.title ?? "Sin título"}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))
								)}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarRail />
			</Sidebar>
		</SidebarProvider>
	);
}

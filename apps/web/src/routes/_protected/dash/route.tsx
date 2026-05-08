import {
	ArrowCircleLeftIcon,
	ArrowCircleRightIcon,
	BriefcaseIcon,
	ChatsIcon,
	GearIcon,
	SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { careerWorkspaceNavigation } from "@/components/domains/dashboard/career-workspace-navigation";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
	const sidebarState = Route.useLoaderData();
	const router = useRouter();

	const { data } = useSuspenseQuery(orpc.generations.list.queryOptions());

	return (
		<SidebarProvider defaultOpenLeft={sidebarState.left} defaultOpenRight={sidebarState.right}>
			<Sidebar className="py-1 pl-0.5" collapsible="icon" variant="inset">
				<SidebarHeader>
					<SidebarMenuButton>
						<BriefcaseIcon />
						<span className="text-nowrap">STK Career</span>
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

			<SidebarInset className="grid h-[calc(100svh-1rem)] grid-rows-[auto_1fr] overflow-hidden rounded-sm border">
				<nav className="flex border-b px-2 py-1">
					<Tooltip>
						<Button
							disabled={!router.history.canGoBack()}
							onClick={() => router.history.back()}
							render={<TooltipTrigger />}
							size="icon-sm"
							variant="ghost-muted"
						>
							<ArrowCircleLeftIcon />
						</Button>

						<TooltipContent>Regresar</TooltipContent>
					</Tooltip>

					<Tooltip>
						<SidebarTrigger render={<TooltipTrigger />} size="sm" variant="ghost-muted">
							<SidebarSimpleIcon weight="duotone" />
							Nav
						</SidebarTrigger>

						<TooltipContent>
							Abrir/Cerrar panel izquierdo <Kbd>⌘ + B</Kbd>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<SidebarTrigger render={<TooltipTrigger />} side="right" size="sm" variant="ghost-muted">
							<ChatsIcon weight="duotone" />
							Chats
						</SidebarTrigger>

						<TooltipContent>
							Abrir/cerrar panel derecho <Kbd>⌘ + J</Kbd>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<Button
							className="ml-auto"
							onClick={() => router.history.forward()}
							render={<TooltipTrigger />}
							size="icon-sm"
							variant="ghost-muted"
						>
							<ArrowCircleRightIcon />
						</Button>

						<TooltipContent>Avanzar</TooltipContent>
					</Tooltip>
				</nav>

				<div className="min-h-0 overflow-y-auto">
					<Outlet />
				</div>
			</SidebarInset>

			<Sidebar className="py-3 pl-0" collapsible="offcanvas" side="right" variant="inset">
				<SidebarContent>
					<SidebarGroup className="p-0">
						<SidebarGroupLabel>Recientes</SidebarGroupLabel>

						<SidebarGroupContent>
							<SidebarMenu className="gap-0">
								{data.length === 0 ? (
									<li className="px-2 py-1 text-muted-foreground text-xs">No hay chats</li>
								) : (
									data.map((gen) => (
										<SidebarMenuItem key={gen.id}>
											<SidebarMenuButton className="gap-1.5" tooltip={gen.summary ?? gen.title ?? "Sin titulo"}>
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

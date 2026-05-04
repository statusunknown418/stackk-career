import { BriefcaseIcon, CalendarIcon, FilesIcon, type Icon, PulseIcon } from "@phosphor-icons/react";
import type { FileRouteTypes } from "@/routeTree.gen";

export interface CareerWorkspaceNavigationItem {
	disabled?: boolean;
	icon: Icon;
	id: string;
	label: string;
	to?: FileRouteTypes["fullPaths"];
}

export const careerWorkspaceNavigation = [
	{
		icon: PulseIcon,
		id: "dashboard",
		label: "Dashboard",
		to: "/dash",
	},
	{
		disabled: true,
		icon: FilesIcon,
		id: "curriculums",
		label: "Curriculums",
		to: "/dash/resumes",
	},
	{
		disabled: true,
		icon: BriefcaseIcon,
		id: "puestos-sugeridos",
		label: "Targets",
		to: "/dash/suggested",
	},
	{
		disabled: true,
		icon: CalendarIcon,
		id: "coaching",
		label: "Coaching",
		to: "/dash/coaches",
	},
] as const satisfies readonly CareerWorkspaceNavigationItem[];

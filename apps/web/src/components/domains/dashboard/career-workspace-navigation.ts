import { BriefcaseIcon, CalendarIcon, ChatCircleTextIcon, FilesIcon, type Icon } from "@phosphor-icons/react";
import type { FileRouteTypes } from "@/routeTree.gen";

export interface CareerWorkspaceNavigationItem {
	disabled?: boolean;
	icon: Icon;
	id: string;
	label: string;
	to?: FileRouteTypes["to"];
}

export const careerWorkspaceNavigation = [
	// {
	// 	icon: PulseIcon,
	// 	id: "dashboard",
	// 	label: "Dashboard",
	// 	to: "/dash",
	// },
	{
		icon: FilesIcon,
		id: "curriculums",
		label: "Curriculums",
		to: "/dash/resumes",
	},
	{
		icon: ChatCircleTextIcon,
		id: "cover-letter",
		label: "Cartas de presentación",
		to: "/dash/letters",
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

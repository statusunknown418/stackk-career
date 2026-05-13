import { AddressBookIcon, SquaresFourIcon } from "@phosphor-icons/react";
import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { getBlockKey } from "./block-key-registry";
import { getSectionIcon } from "./section-icons";

export interface SectionRailItem {
	id: number;
	kind: SectionKind;
	title: string;
}

interface SectionRailProps {
	activeId: number | null;
	contactId?: number | null;
	onSelect: (id: number | null) => void;
	sections: SectionRailItem[];
}

export const SectionRail = ({ activeId, contactId, onSelect, sections }: SectionRailProps) => {
	if (sections.length === 0 && !contactId) {
		return null;
	}

	const allActive = activeId === null;

	return (
		<aside aria-label="Secciones del CV" className="sticky top-44 w-52 flex-none self-start py-0">
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton
						className={"text-muted-foreground data-[active=true]:text-foreground"}
						isActive={allActive}
						onClick={() => onSelect(null)}
					>
						<SquaresFourIcon />
						<span>Todo</span>
					</SidebarMenuButton>
				</SidebarMenuItem>

				{contactId ? (
					<SidebarMenuItem>
						<SidebarMenuButton
							className={"text-muted-foreground data-[active=true]:text-foreground"}
							isActive={activeId === contactId}
							onClick={() => onSelect(activeId === contactId ? null : contactId)}
							tooltip="Contacto"
						>
							<AddressBookIcon />
							<span>Contacto</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				) : null}

				{sections.map((section) => {
					const Icon = getSectionIcon(section.kind);
					const isActive = section.id === activeId;

					return (
						<SidebarMenuItem key={getBlockKey(section.id)}>
							<SidebarMenuButton
								className={"text-muted-foreground data-[active=true]:text-foreground"}
								isActive={isActive}
								onClick={() => onSelect(isActive ? null : section.id)}
								tooltip={section.title}
							>
								{Icon ? <Icon /> : <SquaresFourIcon />}
								<span>{section.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</aside>
	);
};

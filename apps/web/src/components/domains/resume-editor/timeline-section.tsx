import { PencilSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TimelineSectionProps {
	aiGenerated?: boolean;
	children: ReactNode;
	entryCount?: number;
	entryNoun?: { singular: string; plural: string };
	icon?: ComponentType<{ className?: string }> | null;
	isLast?: boolean;
	title: string;
}

export const TimelineSection = ({
	title,
	aiGenerated,
	children,
	entryCount,
	entryNoun,
	icon: Icon,
	isLast,
}: TimelineSectionProps) => {
	const showCount = typeof entryCount === "number" && entryNoun;
	const countLabel = showCount ? `${entryCount} ${entryCount === 1 ? entryNoun.singular : entryNoun.plural}` : null;

	return (
		<section className="group/section relative pl-6">
			{!isLast && <span aria-hidden="true" className="absolute -top-12 bottom-0 left-1 w-px bg-border" />}

			<span aria-hidden="true" className="absolute top-1.5 left-0 size-2 rounded-full bg-foreground" />

			<div className="flex flex-col gap-6">
				<header className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2 pl-2">
						{Icon && <Icon className="size-4 text-muted-foreground" />}
						<h2 className="truncate font-medium text-foreground text-sm">{title}</h2>

						{countLabel && <span className="text-muted-foreground text-xs">· {countLabel}</span>}

						{aiGenerated && (
							<Badge>
								<SparkleIcon weight="fill" />
								AI [K02]
							</Badge>
						)}
					</div>

					<div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/section:opacity-100">
						<Button aria-label={`Enhance ${title} with AI`} size="icon-xs" variant="ghost">
							<SparkleIcon />
						</Button>
						<Button aria-label={`Edit ${title}`} size="icon-xs" variant="ghost">
							<PencilSimpleIcon />
						</Button>
					</div>
				</header>

				{children}
			</div>
		</section>
	);
};

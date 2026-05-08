import { PencilSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TimelineSectionProps {
	aiGenerated?: boolean;
	children: ReactNode;
	isLast?: boolean;
	title: string;
}

export const TimelineSection = ({ title, aiGenerated, isLast, children }: TimelineSectionProps) => (
	<section className="group/section relative pb-4 pl-6 last:pb-0">
		<span aria-hidden="true" className="absolute top-1.5 left-0 size-2 rounded-full bg-foreground" />

		{!isLast && <span aria-hidden="true" className="absolute top-4 bottom-0 left-1 w-px bg-border" />}

		<div className="flex flex-col gap-4">
			<header className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-4 pl-2">
					<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{title}</h2>

					{aiGenerated && (
						<Badge>
							<SparkleIcon weight="fill" />
							AI [K02]
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/section:opacity-100">
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

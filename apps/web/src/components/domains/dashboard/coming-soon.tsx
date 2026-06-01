import { ClockIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

interface ComingSoonProps {
	description?: string;
}

/** Neutral placeholder for features that are unlocked for the current plan but not built yet. */
export function ComingSoon({
	description = "Estamos construyendo esta funcionalidad.",
}: ComingSoonProps): React.ReactElement {
	return (
		<Empty className="rounded-xl border border-dashed">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<ClockIcon />
				</EmptyMedia>
				<EmptyTitle>Próximamente</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface AddSectionButtonProps {
	compact?: boolean;
	label: string;
}

export const AddSectionButton = ({ label, compact }: AddSectionButtonProps) => (
	<Button size={compact ? "xs" : "default"} variant="ghost-muted">
		<PlusIcon />
		{label}
	</Button>
);

import type * as React from "react";
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { UPGRADE_PANEL_DESCRIPTION, UPGRADE_PANEL_TITLE, UpgradePanel } from "./upgrade-panel";

interface UpgradeDialogProps {
	description?: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	title?: string;
}

/** The same upsell surface as the full-page gate, presented in a dialog (e.g. on quota exhaustion). */
export function UpgradeDialog({
	description = UPGRADE_PANEL_DESCRIPTION,
	onOpenChange,
	open,
	title = UPGRADE_PANEL_TITLE,
}: UpgradeDialogProps): React.ReactElement {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogPopup className="sm:max-w-md">
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<DialogDescription className="sr-only">{description}</DialogDescription>
				<UpgradePanel description={description} title={title} variant="bare" />
			</DialogPopup>
		</Dialog>
	);
}

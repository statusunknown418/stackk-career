import { SparkleIcon } from "@phosphor-icons/react";
import { BatteryLowIcon } from "@phosphor-icons/react/dist/ssr";
import type * as React from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { useBillingSheet } from "./use-billing-sheet";

/** Default upsell copy. Single source of truth so the dialog's accessible name matches the visible text. */
export const UPGRADE_PANEL_TITLE = "Oh vaya, esta es una funcionalidad premium";
export const UPGRADE_PANEL_DESCRIPTION =
	"Para acceder, suscríbete a los planes Pro o Max y disfruta de acceso completo a Assendia.";

interface UpgradePanelProps {
	className?: string;
	description?: React.ReactNode;
	title?: string;
	/** `card` is the standalone surface (overlay); `bare` drops the surface for hosts that own it (dialog). */
	variant?: "card" | "bare";
}

export function UpgradePanel({
	className,
	description = UPGRADE_PANEL_DESCRIPTION,
	title = UPGRADE_PANEL_TITLE,
	variant = "card",
}: UpgradePanelProps): React.ReactElement {
	const openBillingSheet = useBillingSheet((state) => state.openBillingSheet);
	const isCard = variant === "card";

	return (
		<Empty
			aria-label="Funcionalidad premium"
			className={cn(
				"rounded-2xl",
				isCard && "relative overflow-hidden border bg-card/85 shadow-sm/5 backdrop-blur-sm",
				className
			)}
			role="group"
		>
			<BorderBeam size={350} />

			<EmptyHeader>
				<EmptyMedia className="size-18" variant="icon">
					<BatteryLowIcon className="size-9 animate-pulse" weight="fill" />
				</EmptyMedia>

				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>

			<EmptyContent>
				<Button className="w-full" onClick={() => openBillingSheet("selector")} size="lg">
					<SparkleIcon weight="fill" />
					Ver planes
				</Button>
			</EmptyContent>
		</Empty>
	);
}

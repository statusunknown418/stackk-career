import { CheckCircleIcon, SparkleIcon } from "@phosphor-icons/react";
import { BadgeCheckIcon } from "lucide-react";
import type * as React from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { useBillingSheet } from "./use-billing-sheet";

/** Default upsell copy. Single source of truth so the dialog's accessible name matches the visible text. */
export const UPGRADE_PANEL_TITLE = "Oh vaya, esta es una funcionalidad premium";
export const UPGRADE_PANEL_DESCRIPTION =
	"Para acceder, suscríbete a los planes Pro o Max y disfruta de acceso completo a Assendia.";

/** Marquee perks unlocked by the paid tiers — drives the upsell feature grid. */
const PREMIUM_FEATURES = [
	"Conversaciones con AI",
	"Sesiones de coaching 1:1",
	"Análisis detallado de CV",
	"Más CVs y versiones",
	"Sugerencias con AI ampliadas",
	"Más cartas de presentación",
] as const;

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
				"rounded-2xl p-12 md:py-12",
				isCard && "relative overflow-hidden border bg-card/85 shadow-sm/5 backdrop-blur-sm",
				className
			)}
			role="group"
		>
			<BorderBeam size={350} />

			<div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
				<div className="flex flex-col items-center text-center md:flex-1 md:items-start md:text-left">
					<EmptyMedia className="size-18" variant="icon">
						<BadgeCheckIcon className="size-9 animate-pulse" />
					</EmptyMedia>

					<EmptyTitle>{title}</EmptyTitle>
					<EmptyDescription>{description}</EmptyDescription>
				</div>

				<div className="flex w-full flex-col gap-4 md:flex-1">
					<div className="flex items-center gap-3 text-muted-foreground text-xs uppercase tracking-wide">
						Incluido en Pro y Max
						<span aria-hidden className="h-px flex-1 bg-border" />
					</div>

					<ul className="flex flex-col gap-2.5 text-left">
						{PREMIUM_FEATURES.map((feature) => (
							<li className="flex items-center gap-2 text-muted-foreground text-sm" key={feature}>
								<CheckCircleIcon className="size-4 shrink-0 text-primary" weight="fill" />
								{feature}
							</li>
						))}
					</ul>

					<Button className="mt-1 w-full" onClick={() => openBillingSheet("selector")} size="lg">
						<SparkleIcon weight="fill" />
						Ver planes
					</Button>
				</div>
			</div>
		</Empty>
	);
}

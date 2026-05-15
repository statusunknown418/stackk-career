import { BeachBallIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export default function Loader({ centered = true, className }: { centered?: boolean; className?: string }) {
	const icon = <BeachBallIcon className={cn("size-4 animate-spin", className)} />;

	if (!centered) {
		return icon;
	}

	return <div className="flex h-full items-center justify-center">{icon}</div>;
}

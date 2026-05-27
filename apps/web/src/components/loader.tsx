import { cn } from "@/lib/utils";
import { Classic } from "./loading-ui/classic";

export default function Loader({ centered = true, className }: { centered?: boolean; className?: string }) {
	const icon = <Classic className={cn("size-4", className)} />;

	if (!centered) {
		return icon;
	}

	return <div className="flex h-full items-center justify-center">{icon}</div>;
}

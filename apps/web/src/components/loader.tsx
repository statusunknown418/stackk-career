import { cn } from "@/lib/utils";
import { DotmSquare5 } from "./ui/dotm-square-5";

export default function Loader({ centered = true, className }: { centered?: boolean; className?: string }) {
	const icon = <DotmSquare5 className={cn("size-5", className)} dotSize={3} size={18} />;

	if (!centered) {
		return icon;
	}

	return <div className="flex h-full items-center justify-center">{icon}</div>;
}

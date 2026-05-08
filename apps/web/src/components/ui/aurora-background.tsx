import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
	className?: string;
}

export function AuroraBackground({ className }: AuroraBackgroundProps) {
	return (
		<div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
			<div className="absolute -top-[20%] -left-[10%] size-[70%] animate-aurora-1 rounded-full bg-aurora-1 opacity-30 blur-3xl will-change-transform motion-reduce:animate-none" />
			<div className="absolute top-[10%] -right-[15%] size-[65%] animate-aurora-2 rounded-full bg-aurora-2 opacity-25 blur-3xl will-change-transform motion-reduce:animate-none" />
			<div className="absolute bottom-[-20%] left-[20%] size-[60%] animate-aurora-1 rounded-full bg-aurora-3 opacity-20 blur-3xl will-change-transform motion-reduce:animate-none" />
		</div>
	);
}

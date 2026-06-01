import { cn } from "@/lib/utils";

type DashRingProps = React.ComponentProps<"svg">;

function DashRing({ className, ...props }: DashRingProps) {
	return (
		<svg
			className={cn(className)}
			fill="none"
			role="status"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<circle cx="12" cy="12" opacity="0.1" r="9.5" strokeLinecap="round" strokeWidth="2" />
			<circle cx="12" cy="12" r="9.5" strokeLinecap="round" strokeWidth="2">
				<animateTransform
					attributeName="transform"
					dur="2s"
					from="0 12 12"
					repeatCount="indefinite"
					to="360 12 12"
					type="rotate"
				/>
				<animate
					attributeName="stroke-dasharray"
					dur="1.5s"
					keyTimes="0;0.5;1"
					repeatCount="indefinite"
					values="0 150;42 150;42 150"
				/>
				<animate
					attributeName="stroke-dashoffset"
					dur="1.5s"
					keyTimes="0;0.5;1"
					repeatCount="indefinite"
					values="0;-16;-59"
				/>
			</circle>
		</svg>
	);
}

export { DashRing };

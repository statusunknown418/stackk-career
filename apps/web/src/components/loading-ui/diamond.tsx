import * as React from "react";
import { cn } from "@/lib/utils";

const Diamond = React.forwardRef<SVGSVGElement, React.ComponentProps<"svg">>(({ className, ...props }, ref) => {
	return (
		<svg
			aria-label="Loading"
			className={cn("size-4", className)}
			fill="currentColor"
			ref={ref}
			role="status"
			viewBox="0 0 20 20"
			{...props}
		>
			<style>
				{`
            @keyframes spin-pixel {
              0% { opacity: 0; }
              1% { opacity: 1; }
              100% { opacity: 0; }
            }
            .pixel-1 { animation: spin-pixel 0.8s ease-in-out 0s infinite; }
            .pixel-2 { animation: spin-pixel 0.8s ease-in-out 0.1s infinite; }
            .pixel-3 { animation: spin-pixel 0.8s ease-in-out 0.2s infinite; }
            .pixel-4 { animation: spin-pixel 0.8s ease-in-out 0.3s infinite; }
            .pixel-5 { animation: spin-pixel 0.8s ease-in-out 0.4s infinite; }
            .pixel-6 { animation: spin-pixel 0.8s ease-in-out 0.5s infinite; }
            .pixel-7 { animation: spin-pixel 0.8s ease-in-out 0.6s infinite; }
            .pixel-8 { animation: spin-pixel 0.8s ease-in-out 0.7s infinite; }
          `}
			</style>
			{/* Top */}
			<rect className="pixel-1" height="4" width="4" x="8" y="0" />
			{/* Top Right */}
			<rect className="pixel-2" height="4" width="4" x="12" y="4" />
			{/* Right */}
			<rect className="pixel-3" height="4" width="4" x="16" y="8" />
			{/* Bottom Right */}
			<rect className="pixel-4" height="4" width="4" x="12" y="12" />
			{/* Bottom */}
			<rect className="pixel-5" height="4" width="4" x="8" y="16" />
			{/* Bottom Left */}
			<rect className="pixel-6" height="4" width="4" x="4" y="12" />
			{/* Left */}
			<rect className="pixel-7" height="4" width="4" x="0" y="8" />
			{/* Top Left */}
			<rect className="pixel-8" height="4" width="4" x="4" y="4" />
		</svg>
	);
});

Diamond.displayName = "Diamond";

export { Diamond };

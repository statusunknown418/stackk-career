import type React from "react";
import { cn } from "@/lib/utils";
import type { Classic } from "../loading-ui/classic";
import { DotmSquare5 } from "./dotm-square-5";

export function Spinner({ className, ...props }: React.ComponentProps<typeof Classic>): React.ReactElement {
	return <DotmSquare5 aria-label="Loading" className={cn(className)} role="status" {...props} dotSize={3} size={18} />;
}

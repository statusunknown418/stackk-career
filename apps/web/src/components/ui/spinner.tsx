import type React from "react";
import { cn } from "@/lib/utils";
import { Classic } from "../loading-ui/classic";

export function Spinner({ className, ...props }: React.ComponentProps<typeof Classic>): React.ReactElement {
	return <Classic aria-label="Loading" className={cn(className)} role="status" {...props} />;
}

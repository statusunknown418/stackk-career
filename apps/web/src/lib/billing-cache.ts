import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export async function invalidateBillingQueries(queryClient: QueryClient): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: orpc.billing.getSnapshot.queryKey() }),
		queryClient.invalidateQueries({ queryKey: orpc.viewer.usage.queryKey() }),
	]);
}

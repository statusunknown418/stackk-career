import { z } from "zod";

/**
 * Input for dismissing a single suggestion. Dismissal is permanent — the compute task
 * excludes dismissed `(source, sourceJobId)` pairs from every future run, so a rejected
 * listing never resurfaces in the feed.
 */
export const dismissSuggestedJobInputSchema = z.object({
	id: z.string().nonempty(),
});
export type DismissSuggestedJobInput = z.infer<typeof dismissSuggestedJobInputSchema>;

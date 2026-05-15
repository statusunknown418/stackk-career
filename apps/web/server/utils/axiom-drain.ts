import { env } from "@stackk-career/env/server";
import { createAxiomDrain } from "evlog/axiom";

export const drain = createAxiomDrain({
	apiKey: env.AXIOM_API_TOKEN,
	dataset: env.AXIOM_DATASET,
});

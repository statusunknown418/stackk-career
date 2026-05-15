import { env } from "@stackk-career/env/server";
import { createAxiomDrain } from "evlog/axiom";
import { definePlugin } from "nitro";

const drain = createAxiomDrain({
	apiKey: env.AXIOM_API_TOKEN,
	dataset: env.AXIOM_DATASET,
});

export default definePlugin((nitroApp) => {
	nitroApp.hooks.hook("evlog:drain", drain);
});

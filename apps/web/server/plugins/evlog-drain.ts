import { env } from "@stackk-career/env/server";
import { createAxiomDrain } from "evlog/axiom";
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
	const drain = createAxiomDrain({
		apiKey: env.AXIOM_API_TOKEN,
		dataset: env.AXIOM_DATASET,
	});

	nitroApp.hooks.hook("evlog:drain", drain);
});

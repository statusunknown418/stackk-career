import evlog from "evlog/nitro/v3";
import { defineConfig } from "nitro/config";

export default defineConfig({
	experimental: {
		asyncContext: true,
	},
	modules: [
		evlog({
			env: {
				service: "stackk-career-web",
			},
		}),
	],
});

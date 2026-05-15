import evlog from "evlog/nitro/v3";
import { defineConfig } from "nitro/config";

export default defineConfig({
	experimental: {
		asyncContext: true,
	},
	preset: "vercel",
	plugins: ["./server/plugins/evlog-drain.ts"],
	modules: [
		evlog({
			env: {
				service: "stackk-career-web",
			},
		}),
	],
});

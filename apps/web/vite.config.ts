import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import evlog from "evlog/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		...evlog({
			client: {
				service: "stackk-career-web",
				transport: {
					enabled: true,
					endpoint: "/api/_evlog/ingest",
				},
			},
		}),
		tailwindcss(),
		tanstackStart(),
		nitro(),
		viteReact(),
	],
	envDir: "../../",
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		port: 3001,
		allowedHosts: [".ngrok-free.dev"],
	},
	optimizeDeps: {
		exclude: ["defu"],
	},
});

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tanstackStart({
			prerender: {
				filter: ({ path }) => path === "/",
			},
			pages: [
				{
					path: "/",
					prerender: { enabled: true },
				},
				{
					path: "/pricing",
					prerender: { enabled: true },
				},
			],
		}),
		viteReact(),
		tailwindcss(),
		nitro(),
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

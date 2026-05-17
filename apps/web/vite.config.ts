import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tanstackStart(), viteReact(), tailwindcss(), nitro()],
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

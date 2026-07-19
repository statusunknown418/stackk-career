import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Every indexable marketing page — the single source for both the explicit
// prerender list and the crawl filter, which stops the crawler from
// prerendering authed/app routes (/login, /dash, …) it discovers via links.
// Keep in sync with public/sitemap.xml.
const PRERENDER_PAGES: Record<string, true> = {
	"/": true,
	"/pricing": true,
	"/score-cv": true,
	"/crear-cv": true,
	"/carta-de-presentacion": true,
	"/optimizador-linkedin": true,
	"/coaching": true,
};

export default defineConfig({
	plugins: [
		tanstackStart({
			prerender: {
				filter: ({ path }) => PRERENDER_PAGES[path] === true,
			},
			pages: Object.keys(PRERENDER_PAGES).map((path) => ({
				path,
				prerender: { enabled: true },
			})),
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
	},
	optimizeDeps: {
		exclude: ["defu"],
	},
});

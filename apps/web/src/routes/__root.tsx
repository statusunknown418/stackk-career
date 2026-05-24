import { pacerDevtoolsPlugin } from "@tanstack/react-pacer-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import type { orpc } from "@/utils/orpc";

import appCss from "../index.css?url";
import "streamdown/styles.css?url";

const Devtools =
	import.meta.env.DEV &&
	lazy(async () => {
		const [{ ReactQueryDevtools }, { TanStackRouterDevtools }, { TanStackDevtools }] = await Promise.all([
			import("@tanstack/react-query-devtools"),
			import("@tanstack/react-router-devtools"),
			import("@tanstack/react-devtools"),
		]);

		return {
			default: () => (
				<>
					<TanStackDevtools
						config={{ position: "top-right", panelLocation: "top" }}
						eventBusConfig={{ debug: false }}
						plugins={[pacerDevtoolsPlugin()]}
					/>

					<TanStackRouterDevtools position="bottom-left" />

					<ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
				</>
			),
		};
	});

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "ASSENDIA · Tu próxima entrevista, garantizada",
			},
			{
				name: "description",
				content:
					"Plataforma de empleo con IA + coaching humano para LATAM. CV reescrito por IA y coach senior real hasta tu próxima entrevista.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
		],
	}),
	server: {
		middleware: [createMiddleware().server(evlogErrorHandler)],
	},
	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="es" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>

			<body>
				<ThemeProvider defaultTheme="dark" storageKey="theme">
					<div className="grid min-h-svh grid-cols-1">
						<Outlet />
					</div>
				</ThemeProvider>

				<Toaster richColors />

				<Scripts />

				{Devtools && (
					<Suspense>
						<Devtools />
					</Suspense>
				)}
			</body>
		</html>
	);
}

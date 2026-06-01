import { pacerDevtoolsPlugin } from "@tanstack/react-pacer-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { evlogErrorHandler } from "@/lib/evlog-error-handler.server";
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
						config={{ position: "top-left", panelLocation: "top" }}
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
				title: "Assendia",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	server: {
		middleware: [createMiddleware().server(evlogErrorHandler)],
	},
	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>

			<body>
				<ThemeProvider defaultTheme="light" storageKey="theme">
					<div className="grid min-h-svh">
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

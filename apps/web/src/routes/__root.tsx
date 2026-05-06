import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import type { orpc } from "@/utils/orpc";
import appCss from "../index.css?url";
import "streamdown/styles.css?url";
import { ThemeProvider } from "@/components/theme-provider";

const Devtools =
	import.meta.env.DEV &&
	lazy(async () => {
		const [{ ReactQueryDevtools }, { TanStackRouterDevtools }] = await Promise.all([
			import("@tanstack/react-query-devtools"),
			import("@tanstack/react-router-devtools"),
		]);

		return {
			default: () => (
				<>
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
				title: "Stackk Career",
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
				<ThemeProvider defaultTheme="system" storageKey="theme">
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

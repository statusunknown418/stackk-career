import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import "./index.css";
import { ArrowCounterClockwiseIcon, TriangleDashedIcon } from "@phosphor-icons/react";
import Loader from "./components/loader";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		defaultPendingMs: 100,
		defaultPendingMinMs: 300,
		context: { orpc, queryClient },
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: () => <div>Not Found</div>,
		defaultErrorComponent: ({ error, reset, info }) => (
			<section>
				<Alert variant="error">
					<TriangleDashedIcon />
					<AlertTitle>Ah, algo ocucrrió</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
					<AlertDescription className="font-mono">{info?.componentStack}</AlertDescription>

					<AlertAction>
						<Button onClick={reset}>
							<ArrowCounterClockwiseIcon />
							Recargar
						</Button>
					</AlertAction>
				</Alert>
			</section>
		),
		Wrap: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}

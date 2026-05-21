import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
	headers: () => ({
		"Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
	}),
	staleTime: 24 * 60 * 60 * 1000, // Caching for 24 hours
	head: () => ({
		meta: [
			{
				title: "Assendia",
			},
			{
				name: "author",
				content: "Stackk Studios",
			},
		],
		links: [
			{ rel: "canonical", href: "https://assendia.com" },
			{ rel: "alternate", href: "https://assendia.com", hrefLang: "es" },
			{ rel: "alternate", href: "https://assendia.com", hrefLang: "x-default" },
			{ rel: "icon", href: "/favicon.ico" },
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
		],
	}),
});

function getStatusLabel(isLoading: boolean, isConnected: boolean): string {
	if (isLoading) {
		return "Checking...";
	}
	return isConnected ? "Connected" : "Disconnected";
}

function HomeComponent() {
	const healthCheck = useQuery(orpc.healthCheck.queryOptions());
	const isConnected = Boolean(healthCheck.data);
	const statusLabel = getStatusLabel(healthCheck.isLoading, isConnected);

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<h1 className="overflow-x-auto font-mono text-sm">Assendia</h1>
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
						<span className="text-muted-foreground text-sm">{statusLabel}</span>
					</div>
				</section>
			</div>

			<section>
				<Button render={<Link to="/login" />}>Login</Button>
			</section>

			<footer>
				<Button render={<Link to="/terms" />}>
					Términos <ArrowSquareOutIcon />
				</Button>

				<Button render={<Link to="/policy" />}>
					Politicas <ArrowSquareOutIcon />
				</Button>
			</footer>
		</div>
	);
}

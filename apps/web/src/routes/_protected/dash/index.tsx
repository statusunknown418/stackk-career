import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dash/")({
	beforeLoad: () => {
		throw redirect({ to: "/dash/resumes" });
	},
});

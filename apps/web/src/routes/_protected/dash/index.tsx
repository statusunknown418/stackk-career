import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dash/")({
	beforeLoad: () => {
		redirect({ to: "/dash/resumes" });

		return;
	},
});

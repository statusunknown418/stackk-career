import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_protected")({
	component: () => <Outlet />,
	beforeLoad: async () => {
		const session = await getUser();

		return { session };
	},
	loader: ({ context, location }) => {
		if (!context.session) {
			redirect({
				to: "/login",
				search: {
					redirect: location,
				},
			});
		}
	},
});

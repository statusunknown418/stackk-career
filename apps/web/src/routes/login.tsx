import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<section className="grid grid-cols-1 place-items-center">
			<LoginForm />
		</section>
	);
}

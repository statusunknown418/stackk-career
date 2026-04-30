import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginForm } from "@/components/login-form";

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	validateSearch: loginSearchSchema,
});

function RouteComponent() {
	return (
		<section className="grid grid-cols-1 place-items-center">
			<LoginForm />
		</section>
	);
}

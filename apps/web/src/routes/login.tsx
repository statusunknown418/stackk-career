import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginForm } from "@/components/login-form";

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	validateSearch: loginSearchSchema,
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
});

function RouteComponent() {
	return <LoginForm />;
}

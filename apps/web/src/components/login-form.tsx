import { CaretCircleLeftIcon } from "@phosphor-icons/react";
import { Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import { Frame, FramePanel } from "./ui/frame";
import { Spinner } from "./ui/spinner";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const [loading, isLoading] = useState(false);
	const search = useSearch({ from: "/login" });

	return (
		<div className={cn("flex w-full max-w-2xl flex-col gap-6", className)} {...props}>
			<section className="flex items-center justify-between">
				<Button render={<Link to="/" />} variant="ghost-muted">
					<CaretCircleLeftIcon />
					Volver
				</Button>

				<AnimatedThemeToggler className="text-muted-foreground hover:text-foreground [&_svg]:size-5" />
			</section>

			<Frame className="p-0">
				<FramePanel className="grid p-0 md:grid-cols-2">
					<form className="p-6 md:p-8">
						<section className="grid gap-8">
							<div className="flex flex-col items-center text-center">
								<h1 className="text-xl">Bienvenido</h1>
								<p className="text-balance text-muted-foreground">Ingresa a Assendia</p>
							</div>

							<section className="grid grid-cols-1 gap-2">
								<Button
									onClick={() => {
										authClient.signIn.social({
											provider: "google",
											newUserCallbackURL: "/setup",
											// Existing users: honor the protected-route redirect URL, else
											// go to /dash (NOT the landing — Better-Auth defaults to / if unset).
											callbackURL: search.redirect ?? "/dash",
											fetchOptions: {
												onRequest: () => {
													isLoading(true);
												},
												onError: () => {
													isLoading(false);
												},
											},
										});
									}}
									size="lg"
									type="button"
								>
									{loading ? (
										<Spinner />
									) : (
										<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
											<title>google</title>
											<path
												d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
												fill="currentColor"
											/>
										</svg>
									)}
									<span>Continuar con Google</span>
								</Button>
							</section>
						</section>
					</form>
					<div className="relative hidden bg-muted md:block" />
				</FramePanel>
			</Frame>
			<CardDescription className="px-6 text-center">
				Al continuar con el registro, aceptas nuestros{" "}
				<Button render={<Link to="/terms" />} size="sm" variant="link">
					Términos de servicio
				</Button>{" "}
				y{" "}
				<Button render={<Link to="/policy" />} size="sm" variant="link">
					Políticas de privacidad.
				</Button>
			</CardDescription>
		</div>
	);
}

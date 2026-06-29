import { CaretCircleLeftIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { Link, useSearch } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearPendingSignup, markPendingSignup } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import { Frame, FramePanel } from "./ui/frame";

export function LoginForm({ className, ...props }: React.ComponentProps<"main">) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const search = useSearch({ from: "/login" });
	const reduceMotion = useReducedMotion() ?? false;

	const signInWithGoogle = () => {
		// Arm the sign-up conversion capture before the OAuth redirect;
		// `AnalyticsBridge` consumes it once the session is restored.
		markPendingSignup();
		authClient.signIn.social({
			provider: "google",
			newUserCallbackURL: "/setup",
			// Existing users: honor the protected-route redirect URL, else go to
			// /dash (NOT the landing — Better-Auth defaults to / if unset).
			callbackURL: search.redirect ?? "/dash",
			fetchOptions: {
				onRequest: () => setIsSubmitting(true),
				onError: () => {
					setIsSubmitting(false);
					// Sign-in never left the page — disarm the conversion flag.
					clearPendingSignup();
				},
			},
		});
	};

	return (
		<main
			className={cn(
				"relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-10",
				className
			)}
			{...props}
		>
			{/* A single, static green glow ties the auth surface to the landing's
			    mesh hero without decorative motion the product register bans. */}
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute top-1/2 left-1/2 size-168 -translate-x-1/2 translate-y-[-60%] rounded-full bg-oxblood/8 blur-[150px] dark:bg-oxblood/10" />
			</div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="flex w-full max-w-md flex-col gap-5"
				initial={reduceMotion ? false : { opacity: 0, y: 12 }}
				transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
			>
				<header className="flex items-center justify-between">
					<Button render={<Link to="/" />} size="sm" variant="ghost-muted">
						<CaretCircleLeftIcon />
						Volver
					</Button>

					<AnimatedThemeToggler
						aria-label="Cambiar tema"
						className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-5"
					/>
				</header>

				<Frame>
					<FramePanel className="flex flex-col gap-7 p-6 sm:p-8">
						<div className="flex flex-col items-center gap-4 text-center">
							<span className="flex items-center gap-2">
								<img
									alt=""
									className="size-8 rounded-lg object-cover"
									height={32}
									src="/assendia-logo.png"
									width={32}
								/>
								<span className="font-display text-base leading-none tracking-tight">ASSENDIA</span>
							</span>

							<div className="flex flex-col gap-1.5">
								<h1 className="text-xl tracking-tight">Bienvenido a ASSENDIA</h1>
								<p className="text-balance text-muted-foreground text-sm leading-relaxed">
									Potencia tu CV y accede a un coach senior real, hasta tu próxima entrevista.
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-3">
							<Button disabled={isSubmitting} loading={isSubmitting} onClick={signInWithGoogle} size="lg">
								<svg aria-hidden="true" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path
										d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
										fill="currentColor"
									/>
								</svg>
								Continuar con Google
							</Button>

							<p className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
								<CheckCircleIcon className="size-4 shrink-0 text-oxblood" weight="fill" />
								Sin tarjeta. Empieza con tu score gratis.
							</p>
						</div>
					</FramePanel>
				</Frame>

				<p className="text-balance px-4 text-center text-muted-foreground text-xs leading-relaxed">
					Al continuar, aceptas nuestros{" "}
					<Button render={<Link to="/terms" />} size="sm" variant="link">
						Términos de servicio
					</Button>{" "}
					y{" "}
					<Button render={<Link to="/policy" />} size="sm" variant="link">
						Políticas de privacidad
					</Button>
					.
				</p>
			</motion.div>
		</main>
	);
}

import { format } from "date-fns";
import { es } from "date-fns/locale";

export function DashboardGreeting() {
	const today = format(new Date(), "EEE, d MMM", { locale: es });

	return (
		<header className="space-y-1">
			<p className="flex items-center gap-2 pl-0.5 font-mono text-muted-foreground text-xs uppercase">
				<span aria-hidden className="size-1.5 rounded-full bg-success" />
				<span>{today}</span>
				<span aria-hidden>·</span>
				<span>Hoy</span>
			</p>

			<h1 className="text-balance font-light text-2xl leading-tight tracking-tight">Buenas tardes, Alvaro</h1>

			<p className="max-w-2xl text-muted-foreground text-sm">
				Casey preparó 3 ediciones durante la noche que suben tu puntaje a ~81. Priya las revisa el jueves a las 2pm.
			</p>
		</header>
	);
}

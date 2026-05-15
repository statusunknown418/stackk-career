import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { FramePanel } from "@/components/ui/frame";

interface DashboardStat {
	delta: string;
	id: string;
	label: string;
	suffix?: string;
	trend: "up" | "down" | "flat";
	value: string;
}

const stats: readonly DashboardStat[] = [
	{ id: "score", label: "Puntaje CV", value: "72", suffix: "/100", delta: "+6 vs semana pasada", trend: "up" },
	{ id: "targets", label: "Targets activos", value: "13", delta: "+2 esta semana", trend: "up" },
	{ id: "applications", label: "Postulaciones", value: "4", delta: "2 en revisión", trend: "flat" },
	{ id: "streak", label: "Racha", value: "11", suffix: "días", delta: "récord personal", trend: "up" },
];

export function DashboardStats() {
	return (
		<section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-4">
			{stats.map((stat) => (
				<FramePanel className="flex flex-col gap-3 p-4" key={stat.id}>
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-wide">{stat.label}</p>

					<p className="flex items-baseline gap-1">
						<span className="font-light text-3xl tracking-tight">{stat.value}</span>
						{stat.suffix && <span className="text-muted-foreground text-sm">{stat.suffix}</span>}
					</p>

					<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
						{stat.trend === "up" && <TrendUpIcon className="size-3.5 text-success" />}
						{stat.trend === "down" && <TrendDownIcon className="size-3.5 text-destructive" />}
						<span>{stat.delta}</span>
					</p>
				</FramePanel>
			))}
		</section>
	);
}

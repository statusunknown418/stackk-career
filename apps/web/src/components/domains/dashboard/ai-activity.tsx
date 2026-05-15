import { ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";

interface ActivityEntry {
	action: string;
	id: string;
	tag: "scan" | "draft" | "match" | "report";
	text: string;
	time: string;
}

const tagLabel: Record<ActivityEntry["tag"], string> = {
	scan: "scan",
	draft: "draft",
	match: "match",
	report: "report",
};

const entries: readonly ActivityEntry[] = [
	{
		id: "scan",
		time: "9:42a",
		tag: "scan",
		text: "Anthropic JD scan completo — match 64% → proyectado 81%",
		action: "Ver ediciones",
	},
	{
		id: "draft",
		time: "ayer",
		tag: "draft",
		text: "3 bullets reescritos para senior-frontend-v4",
		action: "Revisar",
	},
	{
		id: "match",
		time: "ayer",
		tag: "match",
		text: "4 puestos nuevos según tus filtros",
		action: "Explorar",
	},
	{
		id: "report",
		time: "lun",
		tag: "report",
		text: "Reporte semanal listo (66 → 72)",
		action: "Abrir",
	},
];

export function DashboardAiActivity() {
	return (
		<Frame>
			<FrameHeader className="flex flex-row items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
						<SparkleIcon className="size-4" weight="fill" />
					</span>
					<FrameTitle>Actividad IA</FrameTitle>
					<FrameDescription>últimos 7 días</FrameDescription>
				</div>

				<Button size="xs" variant="ghost-muted">
					Ver todo
					<ArrowRightIcon />
				</Button>
			</FrameHeader>

			<FramePanel>
				<ol className="flex flex-col divide-y divide-border">
					{entries.map((entry) => (
						<li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={entry.id}>
							<time className="w-12 shrink-0 font-mono text-muted-foreground text-xs">{entry.time}</time>
							<Badge size="sm" variant="success">
								{tagLabel[entry.tag]}
							</Badge>
							<p className="flex-1 text-sm">{entry.text}</p>
							<Button size="xs" variant="outline">
								{entry.action}
							</Button>
						</li>
					))}
				</ol>
			</FramePanel>
		</Frame>
	);
}

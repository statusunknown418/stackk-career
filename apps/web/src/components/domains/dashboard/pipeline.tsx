import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";

interface PipelineRole {
	context: string;
	id: string;
	match: number;
	role: string;
	target: string;
}

interface PipelineStage {
	accent: "muted" | "active";
	id: string;
	label: string;
	roles: readonly PipelineRole[];
}

const stages: readonly PipelineStage[] = [
	{
		id: "saved",
		label: "Guardadas",
		accent: "muted",
		roles: [
			{ id: "anthropic", target: "Anthropic", role: "Frontend Eng · Producto", context: "cierra en 9d", match: 88 },
			{ id: "linear", target: "Linear", role: "Sr. Frontend Eng", context: "guardado mar", match: 81 },
			{ id: "vercel", target: "Vercel", role: "FE Platform", context: "guardado lun", match: 74 },
		],
	},
	{
		id: "applied",
		label: "Postuladas",
		accent: "muted",
		roles: [
			{ id: "stripe", target: "Stripe", role: "Staff FE · Checkout", context: "enviado hace 3d", match: 91 },
			{ id: "notion", target: "Notion", role: "Sr. FE · Editor", context: "enviado hace 1sem", match: 79 },
		],
	},
	{
		id: "interview",
		label: "Entrevista",
		accent: "muted",
		roles: [
			{ id: "figma", target: "Figma", role: "Sr. SWE · Multiplayer", context: "Ronda 2 · vie", match: 86 },
			{ id: "ramp", target: "Ramp", role: "Sr. FE", context: "phone screen lun", match: 77 },
		],
	},
	{
		id: "offer",
		label: "Oferta",
		accent: "active",
		roles: [{ id: "mercury", target: "Mercury", role: "Sr. FE · Banking", context: "decisión 30 abr", match: 82 }],
	},
];

export function DashboardPipeline() {
	return (
		<Frame>
			<FrameHeader className="flex flex-row items-center justify-between gap-4">
				<div>
					<FrameTitle>Pipeline</FrameTitle>
					<FrameDescription>13 activas · 4 etapas</FrameDescription>
				</div>

				<Button size="xs" variant="ghost-muted">
					Abrir tablero
					<ArrowRightIcon />
				</Button>
			</FrameHeader>

			<FramePanel>
				<ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					{stages.map((stage) => (
						<li className="flex flex-col gap-2 rounded-xl bg-muted/40 p-2" key={stage.id}>
							<header className="flex items-center justify-between px-2 pt-1 pb-0.5">
								<div className="flex items-center gap-2">
									<span
										aria-hidden
										className={
											stage.accent === "active"
												? "size-1.5 rounded-full bg-success"
												: "size-1.5 rounded-full bg-muted-foreground/40"
										}
									/>
									<h3 className="font-medium text-sm">{stage.label}</h3>
								</div>
								<Badge size="sm" variant="outline">
									{stage.roles.length}
								</Badge>
							</header>

							<ol className="flex flex-col gap-2">
								{stage.roles.map((role) => (
									<li key={role.id}>
										<FramePanel className="flex flex-col gap-2 p-3">
											<header className="flex items-start justify-between gap-2">
												<h4 className="font-medium text-sm">{role.target}</h4>
												<span className="font-mono text-muted-foreground text-xs tabular-nums">{role.match}%</span>
											</header>
											<p className="text-muted-foreground text-xs">{role.role}</p>
											<p className="font-mono text-muted-foreground/80 text-xs">{role.context}</p>
											<Progress value={role.match}>
												<ProgressTrack className="h-1">
													<ProgressIndicator
														className={stage.accent === "active" ? "bg-success" : "bg-muted-foreground/40"}
													/>
												</ProgressTrack>
											</Progress>
										</FramePanel>
									</li>
								))}

								<li>
									<Button className="w-full justify-center border-dashed" size="sm" variant="outline">
										<PlusIcon />
										Agregar
									</Button>
								</li>
							</ol>
						</li>
					))}
				</ol>
			</FramePanel>
		</Frame>
	);
}

import { ArrowRightIcon } from "@phosphor-icons/react";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";

interface CoachingSession {
	id: string;
	mentor: string;
	role: string;
	startsAt: Date;
	topic: string;
}

const sessions: readonly CoachingSession[] = [
	{
		id: "priya",
		mentor: "Priya Sharma",
		role: "Ex-Stripe · Staff",
		topic: "Prep Anthropic · ediciones en vivo",
		startsAt: new Date(2026, 4, 7, 14, 0),
	},
	{
		id: "david",
		mentor: "David Lin",
		role: "Anthropic · EM",
		topic: "Coaching system design",
		startsAt: new Date(2026, 4, 12, 11, 0),
	},
	{
		id: "maya",
		mentor: "Maya Rao",
		role: "Notion · Sr FE",
		topic: "Mock conductual",
		startsAt: new Date(2026, 4, 15, 9, 0),
	},
];

const now = new Date();

function formatRelative(date: Date) {
	const diff = differenceInCalendarDays(date, now);
	if (diff <= 0) {
		return "hoy";
	}
	if (diff === 1) {
		return "mañana";
	}
	return `en ${diff} días`;
}

export function DashboardCoaching() {
	return (
		<Frame>
			<FrameHeader className="flex flex-row items-center justify-between gap-4">
				<div>
					<FrameTitle>Agenda de coaching</FrameTitle>
					<FrameDescription>{sessions.length} próximas</FrameDescription>
				</div>

				<Button size="xs" variant="ghost-muted">
					Mentores
					<ArrowRightIcon />
				</Button>
			</FrameHeader>

			<FramePanel className="gap-6">
				<ol className="flex flex-col gap-2">
					{sessions.map((session, index) => {
						const isNext = index === 0;

						return (
							<li
								className={
									isNext
										? "grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl bg-foreground px-3 py-3 text-background"
										: "grid grid-cols-[auto_1fr_auto] items-center gap-4 px-3 py-2"
								}
								key={session.id}
							>
								<time
									className={
										isNext
											? "flex w-12 flex-col items-center rounded-md bg-background/10 py-1 font-mono uppercase"
											: "flex w-12 flex-col items-center rounded-md border bg-muted/40 py-1 font-mono uppercase"
									}
								>
									<span className={isNext ? "text-xs opacity-70" : "text-muted-foreground text-xs"}>
										{format(session.startsAt, "EEE", { locale: es })}
									</span>
									<span className="font-light text-lg leading-none">{format(session.startsAt, "dd")}</span>
									<span className={isNext ? "text-xs opacity-70" : "text-muted-foreground text-xs"}>
										{format(session.startsAt, "MMM", { locale: es })}
									</span>
								</time>

								<div className="min-w-0">
									<p className="flex items-baseline gap-2">
										<span className="truncate font-medium text-sm">{session.mentor}</span>
										<span className={isNext ? "truncate text-xs opacity-70" : "truncate text-muted-foreground text-xs"}>
											{session.role}
										</span>
									</p>
									<p className={isNext ? "truncate text-sm opacity-80" : "truncate text-muted-foreground text-sm"}>
										{session.topic}
									</p>
								</div>

								<div className="flex flex-col items-end font-mono">
									<p className="text-sm">{format(session.startsAt, "h:mma")}</p>
									<p className={isNext ? "text-xs opacity-70" : "text-muted-foreground text-xs"}>
										{formatRelative(session.startsAt)}
									</p>
								</div>
							</li>
						);
					})}
				</ol>
			</FramePanel>
		</Frame>
	);
}

import type { CoachingBookingSummary } from "@stackk-career/schemas/api/coaching";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";

interface ScheduledEventCardProps {
	booking: CoachingBookingSummary;
	stepName: string;
}

export function ScheduledEventCard({ booking, stepName }: ScheduledEventCardProps) {
	const startsAt = booking.startsAt ? new Date(booking.startsAt) : null;
	const endsAt = booking.endsAt ? new Date(booking.endsAt) : null;

	const day = startsAt ? format(startsAt, "PPPP", { locale: es }) : null;

	let timeRange: string | null = null;

	if (startsAt && endsAt) {
		timeRange = `${format(startsAt, "p", { locale: es })} - ${format(endsAt, "p", { locale: es })}`;
	} else if (startsAt) {
		timeRange = format(startsAt, "p", { locale: es });
	}

	const rescheduleUrl = `https://cal.com/reschedule/${booking.calBookingUid}`;
	const cancelUrl = `https://cal.com/booking/${booking.calBookingUid}?cancel=true`;

	return (
		<Frame className="mx-auto h-150 w-full max-w-2xl overflow-y-scroll">
			<FrameHeader className="items-center text-center">
				<div className="flex size-14 items-center justify-center rounded-full bg-success/12 text-success ring-1 ring-success/20">
					<CheckIcon className="size-6" />
				</div>

				<div className="flex flex-col gap-1.5">
					<FrameTitle className="text-2xl">{stepName}</FrameTitle>
					<FrameDescription>Te enviamos un correo con la invitación de calendario y los detalles.</FrameDescription>
				</div>
			</FrameHeader>

			<FramePanel className="grid grid-cols-[90px_1fr] gap-x-6 text-sm">
				<dt className="text-muted-foreground">Sesión</dt>

				<span className="text-foreground">{booking.title ?? "Sesión de coaching"}</span>
			</FramePanel>

			{(day || timeRange) && (
				<FramePanel className="grid grid-cols-[90px_1fr] gap-x-6 text-sm">
					<dt className="text-muted-foreground">Cuándo</dt>

					<div className="flex flex-col gap-0.5">
						{day && <span className="text-foreground capitalize">{day}</span>}
						{timeRange && <span className="text-foreground">{timeRange}</span>}
					</div>
				</FramePanel>
			)}

			{booking.videoCallUrl && (
				<FramePanel className="grid grid-cols-[90px_1fr] items-center gap-x-6 text-sm">
					<dt className="text-muted-foreground">Link</dt>

					<Button
						className="max-w-max justify-start"
						render={<Link rel="noopener" target="_blank" to={booking.videoCallUrl} />}
						size="sm"
						variant="link"
					>
						Cal Video
						<ExternalLinkIcon className="size-3.5 opacity-70" />
					</Button>
				</FramePanel>
			)}

			<FrameFooter className="text-center text-muted-foreground text-sm">
				¿Necesitas hacer un cambio?{" "}
				<Button
					render={
						<a href={rescheduleUrl} rel="noopener" target="_blank">
							Reprograma
						</a>
					}
					variant="link"
				/>{" "}
				o{" "}
				<Button
					render={
						<a href={cancelUrl} rel="noopener" target="_blank">
							Cancela
						</a>
					}
					variant="link"
				/>
			</FrameFooter>
		</Frame>
	);
}

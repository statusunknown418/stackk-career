import type { CoachingBookingSummary } from "@stackk-career/schemas/api/coaching";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameFooter, FrameHeader, FrameTitle } from "@/components/ui/frame";

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "full", timeStyle: "short" });

interface ScheduledEventCardProps {
	booking: CoachingBookingSummary;
}

export function ScheduledEventCard({ booking }: ScheduledEventCardProps) {
	const when = booking.startsAt ? dateFormatter.format(new Date(booking.startsAt)) : null;

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>{booking.title ?? "Sesión agendada"}</FrameTitle>
				{when && <FrameDescription>{when}</FrameDescription>}
			</FrameHeader>
			<FrameFooter className="flex gap-2">
				{booking.videoCallUrl && (
					<Button
						render={
							<a href={booking.videoCallUrl} rel="noopener" target="_blank">
								Unirse a la llamada
							</a>
						}
					/>
				)}
				<Button
					render={
						<a href={`https://cal.com/booking/${booking.calBookingUid}`} rel="noopener" target="_blank">
							Gestionar en Cal
						</a>
					}
					variant="ghost"
				/>
			</FrameFooter>
		</Frame>
	);
}

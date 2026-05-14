import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export function Booker({ eventSlug }: { eventSlug: string }) {
	const getCalConfig = async () => {
		const cal = await getCalApi({ namespace: eventSlug });
		cal("ui", { hideEventTypeDetails: true, layout: "column_view", theme: "light" });
	};

	useEffect(() => {
		getCalConfig();
	}, []);

	return (
		<Cal
			calLink={`statusunknown/${eventSlug}`}
			config={{ layout: "column_view", useSlotsViewOnSmallScreen: "true", theme: "light" }}
			namespace={eventSlug}
			style={{ width: "100%", height: "100%", overflow: "scroll" }}
		/>
	);
}

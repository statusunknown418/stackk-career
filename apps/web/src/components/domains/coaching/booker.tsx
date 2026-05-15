import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

interface BookerProps {
	email: string;
	eventSlug: string;
	name: string;
	userId: string;
}

export function Booker({ email, eventSlug, name, userId }: BookerProps) {
	const getCalConfig = async () => {
		const cal = await getCalApi({ namespace: eventSlug });
		cal("ui", { hideEventTypeDetails: true, layout: "month_view", theme: "light" });
	};

	useEffect(() => {
		getCalConfig();
	}, []);

	return (
		<Cal
			calLink={`statusunknown/${eventSlug}`}
			className="min-h-full overflow-y-scroll"
			config={{
				"cal.locale": "es",
				email,
				layout: "month_view",
				metadata: { userId },
				name,
				theme: "light",
				useSlotsViewOnSmallScreen: "true",
			}}
			namespace={eventSlug}
		/>
	);
}

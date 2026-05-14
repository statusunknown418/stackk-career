import { coachingBookingChangedInputSchema } from "@stackk-career/schemas/jobs/coaching-booking-changed";
import { logger, schemaTask } from "@trigger.dev/sdk";

export const coachingBookingChangedTask = schemaTask({
	id: "coaching-booking-changed",
	schema: coachingBookingChangedInputSchema,
	maxDuration: 10,
	run: (payload) => {
		logger.info("coaching-booking-changed", payload);
		return Promise.resolve(payload);
	},
});

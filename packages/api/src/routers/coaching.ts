import { type CoachingStage, coachingSessions, coachingStageEnum } from "@stackk-career/db/schema/coaching-sessions";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumes } from "@stackk-career/db/schema/resumes";
import { captureCoachingBookingInputSchema } from "@stackk-career/schemas/api/coaching";
import { and, count, desc, eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

const STEP_CONTENT: Record<CoachingStage, { description: string; label: string }> = {
	"cv-analysis": {
		description: "Revisión estratégica de CV, gaps y narrativa antes de salir al mercado.",
		label: "Análisis de CV",
	},
	"pre-interview-training": {
		description: "Práctica enfocada en pitch, preguntas críticas y timing de entrevista.",
		label: "Pre-entrevista training",
	},
	"general-coaching": {
		description: "Sesión abierta para targets, negociación, estrategia o bloqueos puntuales.",
		label: "General Coaching",
	},
	"follow-up": {
		description: "Seguimiento para calibrar avances, próximas acciones y feedback real.",
		label: "Follow up",
	},
};

function toNullableDate(value: string | Date | null | undefined): Date | null {
	if (!value) {
		return null;
	}

	return value instanceof Date ? value : new Date(value);
}

export const coachingRouter = {
	dashboard: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "get_coaching_dashboard",
			user: { id: userId },
		});

		const [bookingRows, [resumeCountRow], [analysisCountRow]] = await Promise.all([
			context.db
				.select()
				.from(coachingSessions)
				.where(eq(coachingSessions.userId, userId))
				.orderBy(desc(coachingSessions.startsAt), desc(coachingSessions.createdAt)),
			context.db.select({ total: count() }).from(resumes).where(eq(resumes.userId, userId)),
			context.db
				.select({ total: count() })
				.from(resumeAnalyses)
				.where(and(eq(resumeAnalyses.userId, userId), eq(resumeAnalyses.status, "ready"))),
		]);

		const bookedStages = new Set(
			bookingRows
				.filter((booking) => booking.bookingStatus.toLowerCase() !== "cancelled")
				.map((booking) => booking.stage)
		);

		const recommendedStage = coachingStageEnum.find((stage) => !bookedStages.has(stage)) ?? coachingStageEnum.at(-1);

		const steps = coachingStageEnum.map((stage) => ({
			completed: bookedStages.has(stage),
			description: STEP_CONTENT[stage].description,
			label: STEP_CONTENT[stage].label,
			stage,
		}));

		const bookings = bookingRows.map((booking) => ({
			bookingStatus: booking.bookingStatus,
			calBookingUid: booking.calBookingUid,
			calEventTypeId: booking.calEventTypeId ?? null,
			calEventTypeSlug: booking.calEventTypeSlug ?? null,
			calLink: booking.calLink,
			createdAt: booking.createdAt,
			endsAt: booking.endsAt ?? null,
			id: booking.id,
			stage: booking.stage,
			startsAt: booking.startsAt ?? null,
			title: booking.title ?? null,
			videoCallUrl: booking.videoCallUrl ?? null,
		}));

		return {
			bookings,
			completedSteps: bookedStages.size,
			hasResumeAnalysis: (analysisCountRow?.total ?? 0) > 0,
			recommendedStage,
			resumeCount: resumeCountRow?.total ?? 0,
			steps,
			viewer: {
				email: context.session.user.email,
				name: context.session.user.name,
			},
		};
	}),

	captureBooking: protectedProcedure.input(captureCoachingBookingInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;
		const startsAt = toNullableDate(input.startsAt);
		const endsAt = toNullableDate(input.endsAt);
		const now = new Date();

		context.log?.set({
			action: "capture_coaching_booking",
			user: { id: userId },
			booking: {
				stage: input.stage,
				uid: input.calBookingUid,
			},
		});

		const [row] = await context.db
			.insert(coachingSessions)
			.values({
				bookingStatus: input.bookingStatus,
				calBookingUid: input.calBookingUid,
				calEventTypeId: input.calEventTypeId ?? null,
				calEventTypeSlug: input.calEventTypeSlug ?? null,
				calLink: input.calLink,
				endsAt,
				stage: input.stage,
				startsAt,
				title: input.title ?? null,
				userId,
				videoCallUrl: input.videoCallUrl ?? null,
			})
			.onConflictDoUpdate({
				target: coachingSessions.calBookingUid,
				set: {
					bookingStatus: input.bookingStatus,
					calEventTypeId: input.calEventTypeId ?? null,
					calEventTypeSlug: input.calEventTypeSlug ?? null,
					calLink: input.calLink,
					endsAt,
					stage: input.stage,
					startsAt,
					title: input.title ?? null,
					updatedAt: now,
					videoCallUrl: input.videoCallUrl ?? null,
				},
			})
			.returning();

		return row ?? null;
	}),
};

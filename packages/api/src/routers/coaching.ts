import { db } from "@stackk-career/db";
import { user } from "@stackk-career/db/schema/auth";
import { type CoachingStage, coachingSessions, coachingStageEnum } from "@stackk-career/db/schema/coaching-sessions";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumes } from "@stackk-career/db/schema/resumes";
import {
	type CoachingStepSummary,
	coachingDashboardSchema,
	coachingRealtimeTokenSchema,
} from "@stackk-career/schemas/api/coaching";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { count, desc, eq } from "drizzle-orm";
import type { RequestLogger } from "evlog";
import { protectedProcedure } from "..";

const REALTIME_TOKEN_TTL_MS = 30 * 60 * 1000;
const REALTIME_TOKEN_EXPIRATION = "30m";

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
	"mock-interview": {
		description: "Simulacro en vivo con feedback inmediato sobre tu desempeño.",
		label: "Mock interview",
	},
	"follow-up": {
		description: "Seguimiento para calibrar avances, próximas acciones y feedback real.",
		label: "Follow up",
	},
};

const STAGE_ORDER = coachingStageEnum;

function pickRecommendedStage(completedStages: Set<CoachingStage>): CoachingStage {
	const next = STAGE_ORDER.find((stage) => !completedStages.has(stage));
	return next ?? STAGE_ORDER.at(-1) ?? STAGE_ORDER[0];
}

function unwrap<T>(result: PromiseSettledResult<T>, fallback: T, part: string, userId: string, log?: RequestLogger): T {
	if (result.status === "fulfilled") {
		return result.value;
	}
	const reason = result.reason;
	log?.error(reason instanceof Error ? reason : new Error(String(reason)), {
		coaching: { action: "dashboard", part, userId },
	});
	return fallback;
}

export const coachingRouter = {
	dashboard: protectedProcedure.output(coachingDashboardSchema).handler(async ({ context }) => {
		const userId = context.session.user.id;
		const log = context.log;

		const [bookingsResult, resumeCountResult, analysisCountResult, viewerResult] = await Promise.allSettled([
			db
				.select({
					bookingStatus: coachingSessions.bookingStatus,
					calBookingUid: coachingSessions.calBookingUid,
					calEventTypeId: coachingSessions.calEventTypeId,
					calEventTypeSlug: coachingSessions.calEventTypeSlug,
					calLink: coachingSessions.calLink,
					createdAt: coachingSessions.createdAt,
					endsAt: coachingSessions.endsAt,
					id: coachingSessions.id,
					stage: coachingSessions.stage,
					startsAt: coachingSessions.startsAt,
					title: coachingSessions.title,
					videoCallUrl: coachingSessions.videoCallUrl,
				})
				.from(coachingSessions)
				.where(eq(coachingSessions.userId, userId))
				.orderBy(desc(coachingSessions.startsAt)),
			db.select({ value: count() }).from(resumes).where(eq(resumes.userId, userId)),
			db.select({ value: count() }).from(resumeAnalyses).where(eq(resumeAnalyses.userId, userId)),
			db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, userId)).limit(1),
		]);

		const bookingsRaw = unwrap(bookingsResult, [], "bookings", userId, log);
		const resumeCountRows = unwrap(resumeCountResult, [], "resumeCount", userId, log);
		const analysisCountRows = unwrap(analysisCountResult, [], "analysisCount", userId, log);
		const viewerRows = unwrap(viewerResult, [], "viewer", userId, log);

		const resumeCount = resumeCountRows[0]?.value ?? 0;
		const hasResumeAnalysis = (analysisCountRows[0]?.value ?? 0) > 0;
		const viewer = viewerRows[0] ?? { email: "", name: "" };

		const completedStages = new Set<CoachingStage>();
		const now = Date.now();
		for (const booking of bookingsRaw) {
			if (booking.bookingStatus === "cancelled") {
				continue;
			}
			if (booking.endsAt && booking.endsAt.getTime() < now) {
				completedStages.add(booking.stage);
			}
		}

		const steps: CoachingStepSummary[] = STAGE_ORDER.map((stage) => ({
			completed: completedStages.has(stage),
			description: STEP_CONTENT[stage].description,
			label: STEP_CONTENT[stage].label,
			stage,
		}));

		const recommendedStage = pickRecommendedStage(completedStages);

		log?.set({
			coaching: {
				action: "dashboard",
				bookingCount: bookingsRaw.length,
				completedSteps: completedStages.size,
				recommendedStage,
				resumeCount,
				userId,
			},
		});

		return {
			bookings: bookingsRaw,
			completedSteps: completedStages.size,
			hasResumeAnalysis,
			recommendedStage,
			resumeCount,
			steps,
			viewer,
		};
	}),

	realtimeToken: protectedProcedure.output(coachingRealtimeTokenSchema).handler(async ({ context }) => {
		const userId = context.session.user.id;
		const token = await triggerAuth.createPublicToken({
			expirationTime: REALTIME_TOKEN_EXPIRATION,
			scopes: { read: { tags: [`user:${userId}`] } },
		});
		context.log?.set({
			coaching: { action: "realtime_token", userId },
		});
		return {
			expiresAtMs: Date.now() + REALTIME_TOKEN_TTL_MS,
			token,
		};
	}),
};

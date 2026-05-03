import { ORPCError } from "@orpc/client";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumes } from "@stackk-career/db/schema/resumes";
import { startOfMonth } from "date-fns";
import { and, between, eq } from "drizzle-orm";
import { protectedProcedure } from "..";

export const viewerRouter = {
	/**
	 * @description Get user limits and usage for the current month -> "generations" | "analyses"
	 * @description The max number of `resumes` is counted since inception
	 */
	usage: protectedProcedure.handler(async ({ context }) => {
		const now = new Date();
		const monthStart = startOfMonth(now);

		const generationsCountPromise = context.db.$count(
			generations,
			and(eq(generations.owner, context.session.user.id), between(generations.createdAt, monthStart, now))
		);

		const analysesCountPromise = context.db.$count(
			resumeAnalyses,
			and(eq(resumeAnalyses.userId, context.session.user.id), between(resumeAnalyses.createdAt, monthStart, now))
		);

		const resumesCountPromise = context.db.$count(resumes, eq(resumes.userId, context.session.user.id));

		const [gens, analyses, totalResumes] = await Promise.allSettled([
			generationsCountPromise,
			analysesCountPromise,
			resumesCountPromise,
		]);

		if (gens.status === "rejected" || analyses.status === "rejected" || totalResumes.status === "rejected") {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "No se pudo encontrar uso para alguno de los modelos",
			});
		}

		return {
			generations: gens.value,
			analyses: analyses.value,
			resumes: totalResumes.value,
		};
	}),
};

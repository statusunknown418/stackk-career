import { ORPCError } from "@orpc/server";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import {
	setResumeAnalysisEditAppliedInputSchema,
	setResumeAnalysisEditDismissedInputSchema,
} from "@stackk-career/schemas/api/resume-analyses";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../";

export const resumeAnalysesRouter = {
	setEditApplied: protectedProcedure
		.input(setResumeAnalysisEditAppliedInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "set_resume_analysis_edit_applied",
				user: { id: userId },
				analysis: { id: input.analysisId },
				editIndex: input.editIndex,
				applied: input.applied,
			});

			const [row] = await context.db
				.select({ id: resumeAnalyses.id, appliedEditIndices: resumeAnalyses.appliedEditIndices })
				.from(resumeAnalyses)
				.where(and(eq(resumeAnalyses.id, input.analysisId), eq(resumeAnalyses.userId, userId)))
				.limit(1);

			if (!row) {
				context.log?.set({ outcome: "not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Analysis not found" });
			}

			const current = new Set(row.appliedEditIndices);
			if (input.applied) {
				current.add(input.editIndex);
			} else {
				current.delete(input.editIndex);
			}
			const next = [...current].sort((a, b) => a - b);

			await context.db
				.update(resumeAnalyses)
				.set({ appliedEditIndices: next })
				.where(eq(resumeAnalyses.id, input.analysisId));

			context.log?.set({ outcome: "updated", count: next.length });

			return { appliedEditIndices: next };
		}),

	setEditDismissed: protectedProcedure
		.input(setResumeAnalysisEditDismissedInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "set_resume_analysis_edit_dismissed",
				user: { id: userId },
				analysis: { id: input.analysisId },
				editIndex: input.editIndex,
				dismissed: input.dismissed,
			});

			const [row] = await context.db
				.select({ id: resumeAnalyses.id, dismissedEditIndices: resumeAnalyses.dismissedEditIndices })
				.from(resumeAnalyses)
				.where(and(eq(resumeAnalyses.id, input.analysisId), eq(resumeAnalyses.userId, userId)))
				.limit(1);

			if (!row) {
				context.log?.set({ outcome: "not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Analysis not found" });
			}

			const current = new Set(row.dismissedEditIndices);
			if (input.dismissed) {
				current.add(input.editIndex);
			} else {
				current.delete(input.editIndex);
			}
			const next = [...current].sort((a, b) => a - b);

			await context.db
				.update(resumeAnalyses)
				.set({ dismissedEditIndices: next })
				.where(eq(resumeAnalyses.id, input.analysisId));

			context.log?.set({ outcome: "updated", count: next.length });

			return { dismissedEditIndices: next };
		}),
};

import { ORPCError } from "@orpc/server";
import { type ResumeAnalysisEditStatuses, resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import {
	applyAllResumeAnalysisEditsInputSchema,
	applyResumeAnalysisEditInputSchema,
	setResumeAnalysisEditDismissedInputSchema,
} from "@stackk-career/schemas/api/resume-analyses";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../";
import { applyResumeAnalysisEdits } from "../lib/resume-analysis/apply-resume-analysis-edit";

export const resumeAnalysesRouter = {
	setEditDismissed: protectedProcedure
		.input(setResumeAnalysisEditDismissedInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "set_resume_analysis_edit_dismissed",
				user: { id: userId },
				analysis: { id: input.analysisId },
				editId: input.editId,
				dismissed: input.dismissed,
			});

			const [row] = await context.db
				.select({ id: resumeAnalyses.id, editStatuses: resumeAnalyses.editStatuses })
				.from(resumeAnalyses)
				.where(and(eq(resumeAnalyses.id, input.analysisId), eq(resumeAnalyses.userId, userId)))
				.limit(1);

			if (!row) {
				context.log?.set({ outcome: "not_found" });
				throw new ORPCError("NOT_FOUND", { message: "Analysis not found" });
			}

			const next: ResumeAnalysisEditStatuses = { ...row.editStatuses };
			if (input.dismissed) {
				next[input.editId] = { status: "dismissed", dismissedAt: Date.now() };
			} else if (next[input.editId]?.status === "dismissed") {
				delete next[input.editId];
			}

			await context.db
				.update(resumeAnalyses)
				.set({ editStatuses: next })
				.where(eq(resumeAnalyses.id, input.analysisId));

			context.log?.set({ outcome: "updated", count: Object.keys(next).length });

			return { editStatuses: next };
		}),

	applyEdit: protectedProcedure.input(applyResumeAnalysisEditInputSchema).handler(async ({ context, input }) => {
		const userId = context.session.user.id;

		context.log?.set({
			action: "apply_resume_analysis_edit",
			user: { id: userId },
			analysis: { id: input.analysisId },
			editId: input.editId,
		});

		const result = await applyResumeAnalysisEdits(context.db, {
			userId,
			analysisId: input.analysisId,
			editIds: [input.editId],
		});

		context.log?.set({ outcome: "done", results: result.results });

		return result;
	}),

	applyAllEdits: protectedProcedure
		.input(applyAllResumeAnalysisEditsInputSchema)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			context.log?.set({
				action: "apply_all_resume_analysis_edits",
				user: { id: userId },
				analysis: { id: input.analysisId },
			});

			const result = await applyResumeAnalysisEdits(context.db, {
				userId,
				analysisId: input.analysisId,
			});

			context.log?.set({
				outcome: "done",
				applied: result.results.filter((entry) => entry.status === "applied").length,
				results: result.results,
			});

			return result;
		}),
};

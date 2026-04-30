import type { ResumeAnalysis } from "@stackk-career/schemas/ai/resume-analysis";
import { streams } from "@trigger.dev/sdk";
import type { DeepPartial } from "ai";

export const resumeAnalysisStream = streams.define<DeepPartial<ResumeAnalysis>>({
	id: "resume-analysis",
});

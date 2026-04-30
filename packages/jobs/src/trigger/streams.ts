import type { ResumeAnalysis } from "@stackk-career/schemas/resume-analysis";
import { streams } from "@trigger.dev/sdk";
import type { DeepPartial } from "ai";

export const resumeAnalysisStream = streams.define<DeepPartial<ResumeAnalysis>>({
	id: "resume-analysis",
});

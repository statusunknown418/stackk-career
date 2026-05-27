import type { ResumeAnalysis } from "@stackk-career/schemas/ai/resume-analysis";
import { streams } from "@trigger.dev/sdk";
import type { DeepPartial } from "ai";
import type { ResumeParserEvent } from "../agents/resume-parser.handler";

export const resumeAnalysisStream = streams.define<DeepPartial<ResumeAnalysis>>({
	id: "resume-analysis",
});

export const resumeParserTraceStream = streams.define<ResumeParserEvent>({
	id: "resume-parser-trace",
});

import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { ResumeAnalysisDraft } from "@stackk-career/schemas/ai/resume-analysis";
import { streams } from "@trigger.dev/sdk";
import type { DeepPartial } from "ai";
import type { ResumeParserEvent } from "../agents/resume-parser.handler";

export const resumeAnalysisStream = streams.define<DeepPartial<ResumeAnalysisDraft>>({
	id: "resume-analysis",
});

export const resumeParserTraceStream = streams.define<ResumeParserEvent>({
	id: "resume-parser-trace",
});

/**
 * Partial CoverLetter chunks emitted by `casey-letters` while the model streams
 * the structured output. The frontend subscribes via
 * `useRealtimeRunWithStreams<typeof caseyLettersTask, { "cover-letter-artifact": DeepPartial<CoverLetter> }>`
 * and renders each section's Shimmer/Skeleton based on which fields are present.
 */
export const coverLetterArtifactStream = streams.define<DeepPartial<CoverLetter>>({
	id: "cover-letter-artifact",
});

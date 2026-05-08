import { ResumeRichTextField } from "./resume-rich-text-field";
import { TimelineSection } from "./timeline-section";

export const SummarySection = () => {
	const summary =
		"<p>Results-driven designer with over 8 years of experience. Specializing in building complex design systems and scaling cross-functional teams. Passionate about accessibility and user-centric logic.</p>";

	return (
		<TimelineSection title="Professional Summary">
			<ResumeRichTextField initialContent={summary} placeholder="Write a concise professional summary." />
		</TimelineSection>
	);
};

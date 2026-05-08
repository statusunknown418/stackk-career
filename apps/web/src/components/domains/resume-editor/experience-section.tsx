import { AddSectionButton } from "./add-section-button";
import { ResumeRichTextField } from "./resume-rich-text-field";
import { TimelineSection } from "./timeline-section";

export const ExperienceSection = () => {
	const items = [
		{
			id: "1",
			role: "Lead Designer",
			company: "Vertex Systems",
			period: "Jan 2020 — Present",
			description:
				"Directed the complete overhaul of the flagship SaaS platform, resulting in a 40% increase in user retention. Implemented a unified design vocabulary that streamlined handoff between engineering and design.",
		},
	];

	return (
		<TimelineSection title="Experience">
			<article className="flex flex-col gap-6">
				<ul className="flex flex-col gap-6">
					{items.map((item) => (
						<li key={item.id}>
							<article className="flex flex-col gap-2">
								<header className="flex flex-col pl-2">
									<p className="text-base text-foreground">
										<span className="font-semibold">{item.role}</span>
										<span className="text-muted-foreground"> at {item.company}</span>
									</p>

									<p className="text-muted-foreground text-sm">
										<time>{item.period}</time>
									</p>
								</header>

								<ResumeRichTextField
									initialContent={`<p>${item.description}</p>`}
									placeholder="Describe the impact and scope of this role."
								/>
							</article>
						</li>
					))}
				</ul>

				<AddSectionButton label="Add experience" />
			</article>
		</TimelineSection>
	);
};

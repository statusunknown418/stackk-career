import { AddSectionButton } from "./add-section-button";
import { TimelineSection } from "./timeline-section";

export const EducationSection = () => {
	const items = [
		{
			id: "1",
			degree: "Bachelor of Fine Arts in Graphic Design",
			school: "Rhode Island School of Design",
		},
	];

	return (
		<TimelineSection title="Education">
			<article className="flex flex-col gap-6">
				<ul className="flex flex-col gap-6">
					{items.map((item) => (
						<li className="pl-2" key={item.id}>
							<article className="flex flex-col">
								<p className="font-semibold text-base text-foreground">{item.degree}</p>
								<p className="text-base text-muted-foreground">{item.school}</p>
							</article>
						</li>
					))}
				</ul>

				<AddSectionButton label="Add education" />
			</article>
		</TimelineSection>
	);
};

import { AddSectionButton } from "./add-section-button";
import { type SkillStrength, StrengthDots } from "./strength-dots";
import { TimelineSection } from "./timeline-section";

export const SkillsSection = () => {
	const skills: { label: string; strength: SkillStrength }[] = [
		{ label: "Design Systems", strength: 3 },
		{ label: "React & Tailwind", strength: 2 },
		{ label: "User Research", strength: 3 },
		{ label: "Figma Mastery", strength: 3 },
		{ label: "Product Strategy", strength: 2 },
		{ label: "Accessibility (WCAG)", strength: 3 },
	];

	return (
		<TimelineSection aiGenerated isLast title="Skills & Competencies">
			<div className="flex flex-wrap items-center gap-2">
				<ul className="contents">
					{skills.map((skill) => (
						<li
							className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
							key={skill.label}
						>
							<span className="text-foreground">{skill.label}</span>
							<StrengthDots strength={skill.strength} />
						</li>
					))}
				</ul>

				<AddSectionButton label="Add skill" />
			</div>
		</TimelineSection>
	);
};

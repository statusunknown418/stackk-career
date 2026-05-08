import { cn } from "@/lib/utils";

export type SkillStrength = 1 | 2 | 3;

interface StrengthDotsProps {
	strength: SkillStrength;
}

export const StrengthDots = ({ strength }: StrengthDotsProps) => (
	<span aria-label={`Strength ${strength} of 3`} className="inline-flex items-center gap-0.5" role="img">
		{[1, 2, 3].map((dot) => (
			<span className={cn("size-1.5 rounded-full", dot <= strength ? "bg-info" : "bg-border")} key={dot} />
		))}
	</span>
);

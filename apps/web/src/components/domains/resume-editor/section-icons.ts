import {
	BriefcaseIcon,
	CertificateIcon,
	FolderSimpleIcon,
	GraduationCapIcon,
	HandHeartIcon,
	TextAlignLeftIcon,
	TranslateIcon,
	WrenchIcon,
} from "@phosphor-icons/react";
import type { SectionKind } from "@stackk-career/schemas/api/resumes";
import type { ComponentType } from "react";

type SectionIconKey = Exclude<SectionKind, "custom">;

export const SECTION_ICONS: Record<SectionIconKey, ComponentType<{ className?: string }>> = {
	summary: TextAlignLeftIcon,
	experience: BriefcaseIcon,
	education: GraduationCapIcon,
	skills: WrenchIcon,
	languages: TranslateIcon,
	certifications: CertificateIcon,
	projects: FolderSimpleIcon,
	volunteering: HandHeartIcon,
};

export const getSectionIcon = (kind: SectionKind): ComponentType<{ className?: string }> | null =>
	kind === "custom" ? null : SECTION_ICONS[kind];

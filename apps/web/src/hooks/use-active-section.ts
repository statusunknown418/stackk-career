"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which of the given section ids is currently the most-visible in the viewport
 * via a single IntersectionObserver. Used by LandingNav for scroll-spy highlighting.
 *
 * The hook owns the observer lifecycle so consumer components stay free of effects.
 */
export function useActiveSection(sectionIds: readonly string[]): string | null {
	const [activeId, setActiveId] = useState<string | null>(null);

	useEffect(() => {
		const elements = sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);

		if (elements.length === 0) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				if (visible[0]) {
					setActiveId(visible[0].target.id);
				}
			},
			{
				rootMargin: "-120px 0px -55% 0px",
				threshold: [0, 0.25, 0.5, 0.75, 1],
			}
		);

		for (const el of elements) {
			observer.observe(el);
		}
		return () => observer.disconnect();
	}, [sectionIds]);

	return activeId;
}
